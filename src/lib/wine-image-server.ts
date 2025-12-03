'use server'

/**
 * Server-side utility functions for fetching wine bottle images
 * Copyright Anysphere Inc.
 * 
 * Priority order:
 * 1. Manual overrides (data/wine-image-overrides.json)
 * 2. Vivino scraping (actual product images)
 * 3. Unsplash API (aesthetic wine photos as fallback)
 * 4. Varietal-based placeholders
 */

import { getWineBottlePlaceholder } from './wine-image-utils'
import { findWineImageMapping } from './wine-image-mapping'
import { getVivinoWineImage } from './vivino-image-fetcher'

// Unsplash search queries optimized for wine images
// These are tailored to return high-quality wine bottle photos
const UNSPLASH_WINE_QUERIES = {
  red: [
    'red wine bottle dark',
    'cabernet wine bottle',
    'red wine glass bottle cellar',
  ],
  white: [
    'white wine bottle chardonnay',
    'white wine bottle elegant',
    'sauvignon blanc bottle',
  ],
  rose: [
    'rose wine bottle pink',
    'rosé wine bottle',
  ],
  sparkling: [
    'champagne bottle',
    'sparkling wine bottle',
    'prosecco bottle',
  ],
  generic: [
    'wine bottle cellar',
    'vintage wine bottle',
    'wine bottle wooden',
  ],
}

/**
 * Determine wine category from varietal
 */
function getWineCategory(varietal?: string | null): keyof typeof UNSPLASH_WINE_QUERIES {
  if (!varietal) return 'generic'
  
  const v = varietal.toLowerCase()
  
  // Red wines
  if (v.includes('cabernet') || v.includes('merlot') || v.includes('pinot noir') ||
      v.includes('syrah') || v.includes('shiraz') || v.includes('zinfandel') ||
      v.includes('malbec') || v.includes('sangiovese') || v.includes('tempranillo') ||
      v.includes('nebbiolo') || v.includes('red')) {
    return 'red'
  }
  
  // White wines
  if (v.includes('chardonnay') || v.includes('sauvignon blanc') || v.includes('riesling') ||
      v.includes('pinot grigio') || v.includes('pinot gris') || v.includes('viognier') ||
      v.includes('gewurztraminer') || v.includes('white')) {
    return 'white'
  }
  
  // Rosé
  if (v.includes('rosé') || v.includes('rose')) {
    return 'rose'
  }
  
  // Sparkling
  if (v.includes('champagne') || v.includes('sparkling') || v.includes('prosecco') ||
      v.includes('cava') || v.includes('brut')) {
    return 'sparkling'
  }
  
  return 'generic'
}

/**
 * Search Unsplash for wine images
 */
async function searchUnsplash(
  accessKey: string,
  query: string
): Promise<string | null> {
  try {
    const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
      console.log(`  ⚠️  Unsplash returned status ${response.status}`)
      return null
    }

    const data = await response.json()
    
    if (data.results && data.results.length > 0) {
      // Prefer regular size for good quality, fall back to small
      const imageUrl = data.results[0].urls.regular || data.results[0].urls.small
      return imageUrl
    }
    
    return null
  } catch (error) {
    console.error('Unsplash search error:', error)
    return null
  }
}

/**
 * Get a wine bottle image URL based on wine details
 * 
 * Tries sources in order:
 * 1. Manual overrides
 * 2. Vivino scraping
 * 3. Unsplash API
 * 4. Varietal placeholders
 */
export async function getWineBottleImage(
  wineName: string,
  vineyard?: string | null,
  varietal?: string | null,
  vintage?: number | null
): Promise<string | null> {
  const wineDesc = `${vineyard || ''} ${wineName} ${vintage || ''}`.trim()
  
  try {
    // 1. Check manual overrides first (highest priority)
    const manualMapping = findWineImageMapping(wineName, vineyard, vintage)
    if (manualMapping) {
      console.log(`✅ Using manual override for: ${wineDesc}`)
      return manualMapping
    }
    
    // 2. Try Vivino (best source for actual product images)
    console.log(`🍷 Searching Vivino for: ${wineDesc}`)
    const vivinoImage = await getVivinoWineImage(wineName, vineyard, vintage)
    if (vivinoImage) {
      console.log(`✅ Found Vivino image for: ${wineDesc}`)
      return vivinoImage
    }
    
    // 3. Try Unsplash API (aesthetic fallback)
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY
    
    if (unsplashAccessKey) {
      console.log(`🖼️  Searching Unsplash for: ${wineDesc}`)
      
      const category = getWineCategory(varietal)
      const queries = UNSPLASH_WINE_QUERIES[category]
      
      // Try category-specific queries
      for (const query of queries) {
        const imageUrl = await searchUnsplash(unsplashAccessKey, query)
        if (imageUrl) {
          console.log(`✅ Found Unsplash image with query: "${query}"`)
          return imageUrl
        }
      }
      
      // Try generic wine queries as last resort
      if (category !== 'generic') {
        for (const query of UNSPLASH_WINE_QUERIES.generic) {
          const imageUrl = await searchUnsplash(unsplashAccessKey, query)
          if (imageUrl) {
            console.log(`✅ Found generic Unsplash image with query: "${query}"`)
            return imageUrl
          }
        }
      }
      
      console.log(`❌ No Unsplash images found for category: ${category}`)
    } else {
      console.log(`⚠️  Unsplash API key not configured, using placeholder`)
    }
    
    // 4. Fall back to placeholder
    console.log(`📷 Using varietal placeholder for: ${wineDesc}`)
    return getWineBottlePlaceholder(varietal)
    
  } catch (error) {
    console.error('Error fetching wine bottle image:', error)
    return getWineBottlePlaceholder(varietal)
  }
}
