'use server'

import { WineFormData } from './types'
import { prisma } from './db'
import { searchWineDatasets } from './wine-dataset-loader'

/**
 * External wine data source interface
 */
export interface ExternalWine {
  name: string
  vineyard?: string
  region: string
  country: string
  varietal: string
  vintage?: number
  description?: string
  alcoholContent?: number
  image?: string
  price?: number
  rating?: number
  source?: string // e.g., 'LWIN', 'Vivino', 'Dataset'
}

/**
 * LWIN API Configuration
 * Requires CLIENT_KEY and CLIENT_SECRET from Liv-ex
 * Set these in your .env.local file:
 * LWIN_CLIENT_KEY=your_client_key
 * LWIN_CLIENT_SECRET=your_client_secret
 */
const LWIN_API_BASE_URL = 'https://api.liv-ex.com'
const LWIN_ENABLED = !!(
  process.env.LWIN_CLIENT_KEY && 
  process.env.LWIN_CLIENT_SECRET
)

/**
 * LWIN API Response Types
 */
interface LWINSearchResponse {
  wines?: Array<{
    lwin?: string
    lwin11?: string
    name?: string
    producer?: string
    region?: string
    subRegion?: string
    country?: string
    color?: string
    type?: string
    vintage?: number
    classification?: string
    size?: string
  }>
  error?: string
}

/**
 * Search LWIN database via API
 * Requires API credentials to be set in environment variables
 */
export async function searchLWIN(
  query: string,
  filters?: {
    varietal?: string
    region?: string
    country?: string
    vintage?: number
  }
): Promise<ExternalWine[]> {
  // Check if LWIN API is configured
  if (!LWIN_ENABLED) {
    console.log('LWIN API not configured. Set LWIN_CLIENT_KEY and LWIN_CLIENT_SECRET in .env.local')
    return []
  }

  try {
    const clientKey = process.env.LWIN_CLIENT_KEY!
    const clientSecret = process.env.LWIN_CLIENT_SECRET!

    // Build search parameters
    const searchParams: any = {
      query: query,
    }

    // Add filters if provided
    if (filters?.country) {
      searchParams.country = filters.country
    }
    if (filters?.region) {
      searchParams.region = filters.region
    }
    if (filters?.vintage) {
      searchParams.vintage = filters.vintage
    }

    // Make API request to LWIN Search endpoint
    // Note: This is a placeholder implementation based on LWIN API documentation
    // Actual endpoint and request format may vary - consult LWIN API docs
    const response = await fetch(`${LWIN_API_BASE_URL}/lwin/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${clientKey}:${clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify(searchParams),
    })

    if (!response.ok) {
      console.error(`LWIN API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: LWINSearchResponse = await response.json()

    if (data.error) {
      console.error(`LWIN API error: ${data.error}`)
      return []
    }

    if (!data.wines || data.wines.length === 0) {
      return []
    }

    // Map LWIN response to ExternalWine format
    const mappedWines: ExternalWine[] = data.wines
      .filter((wine) => wine.name && wine.producer) // Filter out incomplete entries
      .map((wine) => {
        // Map LWIN wine type/color to varietal
        // LWIN uses different classifications, so we'll try to map common ones
        let varietal = wine.type || wine.color || 'Unknown'
        
        // Common mappings
        if (wine.color) {
          if (wine.color.toLowerCase().includes('red')) {
            varietal = filters?.varietal || 'Red Blend'
          } else if (wine.color.toLowerCase().includes('white')) {
            varietal = filters?.varietal || 'White Blend'
          } else if (wine.color.toLowerCase().includes('rose') || wine.color.toLowerCase().includes('rosé')) {
            varietal = 'Rosé'
          }
        }

        return {
          name: wine.name || 'Unknown Wine',
          vineyard: wine.producer || 'Unknown',
          region: wine.subRegion || wine.region || 'Unknown',
          country: wine.country || 'Unknown',
          varietal: varietal,
          vintage: wine.vintage || undefined,
          description: wine.classification 
            ? `${wine.classification}${wine.size ? ` - ${wine.size}` : ''}` 
            : undefined,
          source: 'LWIN',
        }
      })

    return mappedWines
  } catch (error) {
    console.error('Error searching LWIN database:', error)
    return []
  }
}

/**
 * Search external wine sources
 * This function can be extended to query various external APIs
 */
export async function searchExternalWines(
  query: string,
  filters?: {
    varietal?: string
    region?: string
    country?: string
    vintage?: number
  }
): Promise<ExternalWine[]> {
  // This function is kept for backward compatibility
  // Use searchAllExternalSources instead
  return searchAllExternalSources(query, filters)
}

/**
 * Convert external wine format to our WineFormData format
 */
export async function mapExternalWineToFormData(wine: ExternalWine): Promise<WineFormData> {
  return {
    name: wine.name,
    vineyard: wine.vineyard || 'Unknown',
    region: wine.region,
    country: wine.country,
    varietal: wine.varietal,
    vintage: wine.vintage,
    description: wine.description,
    alcoholContent: wine.alcoholContent,
  }
}

/**
 * Cache external wine results in local database
 * This prevents duplicate API calls and improves performance
 * This is a server action
 */
export async function cacheExternalWine(wine: ExternalWine): Promise<string> {
  const formData = await mapExternalWineToFormData(wine)
  
  // Check if wine already exists
  const existing = await prisma.wine.findFirst({
    where: {
      name: formData.name,
      vineyard: formData.vineyard,
      vintage: formData.vintage || null,
    },
  })
  
  if (existing) {
    return existing.id
  }
  
  // Create new wine in database
  const created = await prisma.wine.create({
    data: {
      ...formData,
      vintage: formData.vintage || null,
      alcoholContent: formData.alcoholContent || null,
      image: wine.image || null,
    },
  })
  
  return created.id
}

/**
 * Search wines from a sample dataset
 * This is a placeholder that can be replaced with actual dataset loading
 */
export async function searchSampleDataset(
  query: string,
  filters?: {
    varietal?: string
    region?: string
    country?: string
    vintage?: number
  }
): Promise<ExternalWine[]> {
  // Sample wine data - in production, this would load from a CSV/JSON file
  // or query an external API
  const sampleWines: ExternalWine[] = [
    {
      name: 'Château Margaux',
      vineyard: 'Château Margaux',
      region: 'Bordeaux',
      country: 'France',
      varietal: 'Cabernet Sauvignon',
      vintage: 2015,
      description: 'A legendary Bordeaux wine from one of the five first growths.',
      alcoholContent: 13.5,
      source: 'Sample Dataset',
    },
    {
      name: 'Dom Pérignon',
      vineyard: 'Moët & Chandon',
      region: 'Champagne',
      country: 'France',
      varietal: 'Champagne Blend',
      vintage: 2012,
      description: 'Prestigious Champagne from the house of Moët & Chandon.',
      alcoholContent: 12.5,
      source: 'Sample Dataset',
    },
    {
      name: 'Opus One',
      vineyard: 'Opus One Winery',
      region: 'Napa Valley',
      country: 'United States',
      varietal: 'Cabernet Sauvignon',
      vintage: 2018,
      description: 'A collaboration between Robert Mondavi and Baron Philippe de Rothschild.',
      alcoholContent: 14.5,
      source: 'Sample Dataset',
    },
    {
      name: 'Sassicaia',
      vineyard: 'Tenuta San Guido',
      region: 'Tuscany',
      country: 'Italy',
      varietal: 'Cabernet Sauvignon',
      vintage: 2016,
      description: 'The original Super Tuscan, a Bordeaux-style wine from Italy.',
      alcoholContent: 13.5,
      source: 'Sample Dataset',
    },
    {
      name: 'Penfolds Grange',
      vineyard: 'Penfolds',
      region: 'South Australia',
      country: 'Australia',
      varietal: 'Shiraz',
      vintage: 2017,
      description: 'Australia\'s most celebrated wine, a Shiraz-based blend.',
      alcoholContent: 14.5,
      source: 'Sample Dataset',
    },
  ]
  
  // Filter wines based on query and filters
  let filtered = sampleWines.filter((wine) => {
    // Search query matching
    if (query) {
      const searchLower = query.toLowerCase()
      const matchesQuery =
        wine.name.toLowerCase().includes(searchLower) ||
        wine.vineyard?.toLowerCase().includes(searchLower) ||
        wine.region.toLowerCase().includes(searchLower) ||
        wine.varietal.toLowerCase().includes(searchLower) ||
        wine.country.toLowerCase().includes(searchLower)
      
      if (!matchesQuery) return false
    }
    
    // Filter by varietal
    if (filters?.varietal && wine.varietal !== filters.varietal) {
      return false
    }
    
    // Filter by region
    if (filters?.region && !wine.region.toLowerCase().includes(filters.region.toLowerCase())) {
      return false
    }
    
    // Filter by country
    if (filters?.country && wine.country !== filters.country) {
      return false
    }
    
    // Filter by vintage
    if (filters?.vintage && wine.vintage !== filters.vintage) {
      return false
    }
    
    return true
  })
  
  return filtered
}

/**
 * Main function to search external wine sources
 * Combines multiple sources and returns unified results
 */
export async function searchAllExternalSources(
  query: string,
  filters?: {
    varietal?: string
    region?: string
    country?: string
    vintage?: number
  }
): Promise<ExternalWine[]> {
  try {
    const allResults: ExternalWine[] = []
    
    // Search LWIN database if configured
    if (LWIN_ENABLED) {
      try {
        const lwinResults = await searchLWIN(query, filters)
        allResults.push(...lwinResults)
      } catch (error) {
        console.error('Error searching LWIN:', error)
        // Continue with other sources even if LWIN fails
      }
    }
    
    // Search loaded CSV/JSON datasets from /data directory
    try {
      const fileDatasetResults = await searchWineDatasets(query, filters)
      allResults.push(...fileDatasetResults)
    } catch (error) {
      console.error('Error searching file datasets:', error)
      // Fall back to sample dataset if file loading fails
      const datasetResults = await searchSampleDataset(query, filters)
      allResults.push(...datasetResults)
    }
    
    // In the future, add more sources here:
    // const vivinoResults = await searchVivino(query, filters)
    // allResults.push(...vivinoResults)
    
    // Deduplicate by name, vineyard, and vintage
    // Prioritize LWIN results over sample dataset
    const uniqueResults = allResults.filter((wine, index, self) =>
      index === self.findIndex((w) =>
        w.name.toLowerCase() === wine.name.toLowerCase() &&
        w.vineyard?.toLowerCase() === wine.vineyard?.toLowerCase() &&
        w.vintage === wine.vintage
      )
    )
    
    // Sort by source priority (LWIN first, then others)
    uniqueResults.sort((a, b) => {
      if (a.source === 'LWIN' && b.source !== 'LWIN') return -1
      if (a.source !== 'LWIN' && b.source === 'LWIN') return 1
      return 0
    })
    
    return uniqueResults
  } catch (error) {
    console.error('Error searching external wine sources:', error)
    return []
  }
}

