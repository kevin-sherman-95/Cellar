'use server'

/**
 * Fetch wine bottle images from Vivino
 * Copyright Anysphere Inc.
 * 
 * Improved version with:
 * - Multiple search strategies (exact, fuzzy, vineyard-only)
 * - Next.js __NEXT_DATA__ extraction
 * - Better image URL patterns for Vivino's CDN
 * - Comprehensive logging
 */

// Vivino image CDN patterns
const VIVINO_IMAGE_PATTERNS = {
  // Standard bottle images: https://images.vivino.com/thumbs/ApThIPsaqJZBEONgk9GnmA_375x500.jpg
  thumbs: /https?:\/\/images\.vivino\.com\/thumbs\/[A-Za-z0-9_-]+(?:_\d+x\d+)?\.(?:jpg|jpeg|png|webp)/gi,
  
  // Full-size images: https://images.vivino.com/wines/abcd1234.jpg
  wines: /https?:\/\/images\.vivino\.com\/wines\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi,
  
  // Label images
  labels: /https?:\/\/images\.vivino\.com\/labels\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi,
}

// URLs to filter out (not wine bottles)
const EXCLUDED_PATTERNS = [
  'logo',
  'icon',
  'avatar',
  'placeholder',
  'profile',
  'user',
  'badge',
  'flag',
  'country',
  'grape',
  'region',
  'merchant',
  'store',
]

interface VivinoSearchResult {
  imageUrl: string | null
  source: 'next_data' | 'html_pattern' | 'json_ld' | null
  searchQuery: string
}

/**
 * Clean and validate a Vivino image URL
 */
function cleanImageUrl(url: string): string | null {
  if (!url) return null
  
  let cleaned = url.trim().replace(/^["']|["']$/g, '')
  
  // Ensure full URL
  if (cleaned.startsWith('//')) {
    cleaned = 'https:' + cleaned
  } else if (cleaned.startsWith('/')) {
    cleaned = 'https://images.vivino.com' + cleaned
  }
  
  // Must be from Vivino's image CDN
  if (!cleaned.includes('images.vivino.com')) {
    return null
  }
  
  // Filter out non-wine images
  const lowerUrl = cleaned.toLowerCase()
  for (const excluded of EXCLUDED_PATTERNS) {
    if (lowerUrl.includes(excluded)) {
      return null
    }
  }
  
  // Upgrade to larger image size if it's a thumb
  // Change _375x500 to _pb_x600 for better quality
  cleaned = cleaned.replace(/_\d+x\d+\./, '_pb_x600.')
  
  return cleaned
}

/**
 * Extract wine images from Vivino's __NEXT_DATA__ JSON
 * This is the most reliable method as it contains structured data
 */
function extractFromNextData(html: string): string[] {
  const images: string[] = []

  // Recursively search for image URLs in the data
  const findImages = (obj: unknown, depth = 0): void => {
    if (depth > 10) return // Prevent infinite recursion

    if (typeof obj === 'string') {
      if (
        obj.includes('images.vivino.com') &&
        (obj.includes('thumbs') || obj.includes('wines') || obj.includes('labels'))
      ) {
        const cleaned = cleanImageUrl(obj)
        if (cleaned) images.push(cleaned)
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => findImages(item, depth + 1))
    } else if (obj && typeof obj === 'object') {
      // Look for common image property names
      const imageKeys = ['image', 'imageUrl', 'image_url', 'thumb', 'thumbnail', 'picture', 'photo']
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (imageKeys.includes(key.toLowerCase()) && typeof value === 'string') {
          const cleaned = cleanImageUrl(value)
          if (cleaned) images.push(cleaned)
        }
        findImages(value, depth + 1)
      }
    }
  }

  try {
    // Find the __NEXT_DATA__ script tag
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!nextDataMatch) {
      return images
    }

    const nextData = JSON.parse(nextDataMatch[1])
    findImages(nextData)
  } catch (error) {
    console.log('Could not parse __NEXT_DATA__:', error)
  }

  // Remove duplicates while staying compatible with ES5 target
  return Array.from(new Set(images))
}

/**
 * Extract images using regex patterns on HTML
 */
function extractFromHtmlPatterns(html: string): string[] {
  const images: string[] = []

  // Iterate patterns without relying on ES2015 iterators for ES5 compatibility
  Object.values(VIVINO_IMAGE_PATTERNS).forEach(pattern => {
    // Ensure we always have the global flag set so exec() can iterate
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
    const globalRegex = new RegExp(pattern.source, flags)

    let match: RegExpExecArray | null
    // eslint-disable-next-line no-cond-assign
    while ((match = globalRegex.exec(html)) !== null) {
      const cleaned = cleanImageUrl(match[0])
      if (cleaned) {
        images.push(cleaned)
      }
    }
  })

  // Remove duplicates while staying compatible with ES5 target
  return Array.from(new Set(images))
}

/**
 * Extract images from JSON-LD structured data
 */
function extractFromJsonLd(html: string): string[] {
  const images: string[] = []

  // Use a regex compatible with ES5 (no dotAll flag) and iterate via exec()
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let match: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(match[1])

      // Check for image property
      if (jsonData.image) {
        const imageValue =
          typeof jsonData.image === 'string'
            ? jsonData.image
            : jsonData.image.url || jsonData.image[0]

        if (imageValue) {
          const cleaned = cleanImageUrl(imageValue)
          if (cleaned) images.push(cleaned)
        }
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  // Remove duplicates while staying compatible with ES5 target
  return Array.from(new Set(images))
}

/**
 * Build search queries with different strategies.
 * Uses all available wine metadata (vineyard, vintage, varietal, region,
 * country) to maximise the chance of finding the correct bottle image.
 */
function buildSearchQueries(
  wineName: string,
  vineyard?: string | null,
  vintage?: number | null,
  varietal?: string | null,
  region?: string | null,
  country?: string | null,
): string[] {
  const queries: string[] = []
  
  // Strategy 1: Full query (vineyard + wine name + vintage)
  if (vineyard && vintage) {
    queries.push(`${vineyard} ${wineName} ${vintage}`)
  }

  // Strategy 2: Vineyard + wine name + varietal (helps disambiguate generic names)
  if (vineyard && varietal) {
    queries.push(`${vineyard} ${wineName} ${varietal}`)
  }
  
  // Strategy 3: Vineyard + wine name (no vintage)
  if (vineyard) {
    queries.push(`${vineyard} ${wineName}`)
  }

  // Strategy 4: Include region/country for extra specificity
  if (vineyard && region) {
    queries.push(`${vineyard} ${wineName} ${region}`)
  }
  if (vineyard && country) {
    queries.push(`${vineyard} ${wineName} ${country}`)
  }
  
  // Strategy 5: Wine name + vintage
  if (vintage) {
    queries.push(`${wineName} ${vintage}`)
  }
  
  // Strategy 6: Just wine name
  queries.push(wineName)
  
  // Strategy 7: Just vineyard (for winery-specific wines)
  if (vineyard && vineyard.toLowerCase() !== wineName.toLowerCase()) {
    queries.push(vineyard)
  }
  
  // Remove duplicates and empty queries while staying compatible with ES5 target
  return Array.from(new Set(queries.filter(q => q.trim().length > 0)))
}

const VIVINO_REQUEST_DELAY_MS = 1000
let lastVivinoRequestTime = 0

/**
 * Fetch HTML from Vivino search with rate-limit awareness.
 * Spaces requests by at least 1 second and retries once on 429.
 */
async function fetchVivinoSearch(query: string): Promise<string | null> {
  const searchUrl = `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`

  const elapsed = Date.now() - lastVivinoRequestTime
  if (elapsed < VIVINO_REQUEST_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, VIVINO_REQUEST_DELAY_MS - elapsed))
  }

  const doFetch = async (): Promise<Response> => {
    lastVivinoRequestTime = Date.now()
    return fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.vivino.com/',
        'Cache-Control': 'no-cache',
      },
      next: { revalidate: 86400 },
    })
  }

  try {
    let response = await doFetch()

    if (response.status === 429) {
      console.log('  ⚠️  Vivino 429 rate limit — waiting 3s and retrying once')
      await new Promise(resolve => setTimeout(resolve, 3000))
      response = await doFetch()
    }

    if (!response.ok) {
      console.log(`  ⚠️  Vivino returned status ${response.status}`)
      return null
    }

    return await response.text()
  } catch (error) {
    console.log(`  ⚠️  Fetch error:`, error)
    return null
  }
}

/**
 * Search Vivino for a wine and extract the bottle image URL
 * Uses multiple strategies for better success rate
 * 
 * @param wineName - Name of the wine
 * @param vineyard - Vineyard/winery name
 * @param vintage - Vintage year (optional)
 * @returns Image URL or null if not found
 */
export async function fetchWineImageFromVivino(
  wineName: string,
  vineyard?: string | null,
  vintage?: number | null,
  varietal?: string | null,
  region?: string | null,
  country?: string | null,
): Promise<string | null> {
  const searchQueries = buildSearchQueries(wineName, vineyard, vintage, varietal, region, country)
  
  console.log(`🔍 Vivino search for: "${vineyard || ''} ${wineName} ${vintage || ''}"`.trim())
  console.log(`   Trying ${searchQueries.length} search strategies...`)
  
  for (const query of searchQueries) {
    console.log(`   📝 Query: "${query}"`)
    
    const html = await fetchVivinoSearch(query)
    if (!html) continue
    
    // Try extraction methods in order of reliability
    
    // 1. __NEXT_DATA__ (most reliable for Next.js sites like Vivino)
    const nextDataImages = extractFromNextData(html)
    if (nextDataImages.length > 0) {
      console.log(`   ✅ Found ${nextDataImages.length} image(s) via __NEXT_DATA__`)
      return nextDataImages[0]
    }
    
    // 2. HTML patterns
    const htmlImages = extractFromHtmlPatterns(html)
    if (htmlImages.length > 0) {
      console.log(`   ✅ Found ${htmlImages.length} image(s) via HTML patterns`)
      return htmlImages[0]
    }
    
    // 3. JSON-LD
    const jsonLdImages = extractFromJsonLd(html)
    if (jsonLdImages.length > 0) {
      console.log(`   ✅ Found ${jsonLdImages.length} image(s) via JSON-LD`)
      return jsonLdImages[0]
    }
    
    console.log(`   ❌ No images found for this query`)
  }
  
  console.log(`❌ No Vivino image found after trying all strategies`)
  return null
}

/**
 * Get wine image from Vivino with fallback strategies
 */
export async function getVivinoWineImage(
  wineName: string,
  vineyard?: string | null,
  vintage?: number | null,
  varietal?: string | null,
  region?: string | null,
  country?: string | null,
): Promise<string | null> {
  try {
    return await fetchWineImageFromVivino(wineName, vineyard, vintage, varietal, region, country)
  } catch (error) {
    console.error('Error in getVivinoWineImage:', error)
    return null
  }
}
