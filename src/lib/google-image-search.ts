'use server'

/**
 * Wine bottle image search via SerpAPI (Google Images engine).
 *
 * Replaces the deprecated Google Custom Search JSON API.
 * Results are scored by domain trust, image aspect ratio
 * (portrait preferred), and query-term overlap so we persist
 * only high-confidence matches.
 */

import { getJson } from 'serpapi'

const TRUSTED_WINE_DOMAINS = [
  'vivino.com',
  'wine.com',
  'totalwine.com',
  'wine-searcher.com',
  'cellartracker.com',
  'winelibrary.com',
  'klwines.com',
  'wineenthusiast.com',
  'decanter.com',
  'jamesuckling.com',
  'robertparker.com',
]

const REJECTED_IMAGE_KEYWORDS = [
  'logo',
  'icon',
  'avatar',
  'banner',
  'hero',
  'map',
  'flag',
  'badge',
  'profile',
  'vineyard-aerial',
  'tasting-room',
  'restaurant',
]

interface SerpImageResult {
  original: string
  original_width: number
  original_height: number
  title: string
  link: string
  source: string
  thumbnail?: string
  is_product?: boolean
}

interface ScoredResult {
  url: string
  score: number
  source: string
}

function buildSearchQueries(
  wineName: string,
  vineyard?: string | null,
  varietal?: string | null,
  vintage?: number | null,
  region?: string | null,
  country?: string | null,
): string[] {
  const queries: string[] = []

  const parts = [vineyard, wineName, vintage?.toString()].filter(Boolean)

  if (parts.length > 0) {
    queries.push(`${parts.join(' ')} wine bottle`)
  }

  if (vineyard && vintage) {
    queries.push(`${vineyard} ${wineName} ${vintage} bottle label`)
  }

  if (vineyard) {
    queries.push(`${vineyard} ${wineName} wine bottle`)
  }

  if (varietal && vineyard) {
    queries.push(`${vineyard} ${varietal} wine bottle`)
  }

  if (vineyard && country) {
    queries.push(`${vineyard} ${wineName} ${country} wine bottle`)
  }

  if (vineyard && region) {
    queries.push(`${vineyard} ${wineName} ${region} wine bottle`)
  }

  return [...new Set(queries)]
}

function scoreResult(
  result: SerpImageResult,
  wineName: string,
  vineyard?: string | null,
  vintage?: number | null,
): number {
  let score = 0
  const { original_width, original_height, title, source } = result
  const url = result.original.toLowerCase()
  const context = title.toLowerCase()

  for (const kw of REJECTED_IMAGE_KEYWORDS) {
    if (url.includes(kw)) return -1
  }

  const aspectRatio = original_height / original_width
  if (aspectRatio >= 1.3) score += 3
  else if (aspectRatio >= 1.0) score += 1
  else score -= 1

  if (original_height < 200 || original_width < 100) return -1

  for (const domain of TRUSTED_WINE_DOMAINS) {
    if (source.toLowerCase().includes(domain)) {
      score += 4
      break
    }
  }

  if (vineyard) {
    const slug = vineyard.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (source.toLowerCase().replace(/[^a-z0-9]/g, '').includes(slug)) {
      score += 5
    }
  }

  if (vineyard && context.includes(vineyard.toLowerCase())) score += 2
  if (context.includes(wineName.toLowerCase())) score += 2
  if (vintage && context.includes(vintage.toString())) score += 1

  if (url.includes('/wine/') || url.includes('/product/') || url.includes('/wines/')) {
    score += 2
  }

  if (result.is_product) score += 1

  return score
}

async function executeSerpApiSearch(
  query: string,
  apiKey: string,
): Promise<SerpImageResult[]> {
  try {
    const response = await getJson({
      api_key: apiKey,
      engine: 'google_images',
      q: query,
      num: '10',
      safe: 'active',
    })

    return (response.images_results ?? []) as SerpImageResult[]
  } catch (err) {
    console.error('SerpAPI fetch error:', err)
    return []
  }
}

const MIN_CONFIDENCE_SCORE = 4

/**
 * Search Google Images (via SerpAPI) for a wine bottle photo.
 * Returns the best-scoring image URL, or null when confidence is too low.
 */
export async function searchGoogleForWineImage(
  wineName: string,
  vineyard?: string | null,
  varietal?: string | null,
  vintage?: number | null,
  region?: string | null,
  country?: string | null,
): Promise<string | null> {
  const apiKey = process.env.SERPAPI_API_KEY

  if (!apiKey) {
    console.log('SerpAPI not configured (missing SERPAPI_API_KEY)')
    return null
  }

  const queries = buildSearchQueries(wineName, vineyard, varietal, vintage, region, country)
  const wineDesc = `${vineyard || ''} ${wineName} ${vintage || ''}`.trim()
  console.log(`🔎 SerpAPI Image Search for: "${wineDesc}" (${queries.length} queries)`)

  const allScored: ScoredResult[] = []

  for (const query of queries) {
    console.log(`   Query: "${query}"`)
    const results = await executeSerpApiSearch(query, apiKey)

    for (const r of results) {
      const s = scoreResult(r, wineName, vineyard, vintage)
      if (s >= 0) {
        allScored.push({ url: r.original, score: s, source: r.source })
      }
    }

    const best = allScored.reduce<ScoredResult | null>(
      (a, b) => (!a || b.score > a.score ? b : a),
      null,
    )
    if (best && best.score >= MIN_CONFIDENCE_SCORE + 3) {
      console.log(`   Early match (score ${best.score}): ${best.source}`)
      return best.url
    }
  }

  if (allScored.length === 0) {
    console.log('   No image candidates found')
    return null
  }

  allScored.sort((a, b) => b.score - a.score)
  const top = allScored[0]

  if (top.score >= MIN_CONFIDENCE_SCORE) {
    console.log(`   Best match (score ${top.score}): ${top.source}`)
    return top.url
  }

  console.log(`   Best score ${top.score} below threshold ${MIN_CONFIDENCE_SCORE} — skipping`)
  return null
}
