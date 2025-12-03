/**
 * Manual mapping of specific wines to their bottle images
 * Copyright Anysphere Inc.
 * 
 * This module provides accurate bottle images for specific wines
 * that may not be found through Vivino scraping.
 * 
 * Supports two sources:
 * 1. JSON file at data/wine-image-overrides.json (recommended for bulk additions)
 * 2. Hardcoded mappings below (for quick fixes)
 */

import * as fs from 'fs'
import * as path from 'path'

export interface WineImageMapping {
  name: string
  vineyard: string
  vintage?: number
  imageUrl: string
}

interface OverridesFile {
  overrides: WineImageMapping[]
}

/**
 * Hardcoded wine image mappings
 * For quick overrides - prefer using data/wine-image-overrides.json for bulk additions
 */
const HARDCODED_MAPPINGS: WineImageMapping[] = [
  // Add quick overrides here if needed
  // These take precedence over JSON file entries
]

/**
 * Load wine image overrides from the JSON file
 */
function loadJsonOverrides(): WineImageMapping[] {
  try {
    // Try multiple possible paths (dev server vs build)
    const possiblePaths = [
      path.join(process.cwd(), 'data', 'wine-image-overrides.json'),
      path.join(__dirname, '..', '..', '..', 'data', 'wine-image-overrides.json'),
    ]
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const data: OverridesFile = JSON.parse(content)
        
        if (data.overrides && Array.isArray(data.overrides)) {
          console.log(`📁 Loaded ${data.overrides.length} wine image override(s) from JSON`)
          return data.overrides
        }
      }
    }
    
    return []
  } catch (error) {
    console.error('Error loading wine image overrides:', error)
    return []
  }
}

// Cache the loaded overrides
let cachedOverrides: WineImageMapping[] | null = null
let cacheTime = 0
const CACHE_TTL = 60000 // 1 minute cache

/**
 * Get all wine image mappings (hardcoded + JSON file)
 */
function getAllMappings(): WineImageMapping[] {
  const now = Date.now()
  
  // Use cached overrides if still valid
  if (cachedOverrides && (now - cacheTime) < CACHE_TTL) {
    return [...HARDCODED_MAPPINGS, ...cachedOverrides]
  }
  
  // Reload from JSON file
  cachedOverrides = loadJsonOverrides()
  cacheTime = now
  
  // Hardcoded mappings take precedence (come first)
  return [...HARDCODED_MAPPINGS, ...cachedOverrides]
}

/**
 * Normalize a string for matching (lowercase, trim, remove extra spaces)
 */
function normalize(str: string | null | undefined): string {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Find a manual image mapping for a wine
 * 
 * Matching strategy (in order):
 * 1. Exact match: name + vineyard + vintage
 * 2. Name + vineyard (ignoring vintage)
 * 3. Partial name match with vineyard
 * 4. Wine ID match (if provided in mapping)
 */
export function findWineImageMapping(
  wineName: string,
  vineyard?: string | null,
  vintage?: number | null
): string | null {
  const mappings = getAllMappings()
  
  if (mappings.length === 0) {
    return null
  }
  
  const normalizedName = normalize(wineName)
  const normalizedVineyard = normalize(vineyard)
  
  // Strategy 1: Exact match with vintage
  if (vintage) {
    const exactMatch = mappings.find(
      mapping =>
        normalize(mapping.name) === normalizedName &&
        normalize(mapping.vineyard) === normalizedVineyard &&
        mapping.vintage === vintage
    )
    if (exactMatch) {
      console.log(`✅ Found exact wine image override for: ${vineyard} ${wineName} ${vintage}`)
      return exactMatch.imageUrl
    }
  }
  
  // Strategy 2: Match without vintage
  const matchWithoutVintage = mappings.find(
    mapping =>
      normalize(mapping.name) === normalizedName &&
      normalize(mapping.vineyard) === normalizedVineyard &&
      !mapping.vintage // Only match if override doesn't specify a vintage
  )
  if (matchWithoutVintage) {
    console.log(`✅ Found wine image override (no vintage) for: ${vineyard} ${wineName}`)
    return matchWithoutVintage.imageUrl
  }
  
  // Strategy 3: Partial name match with vineyard
  const partialMatch = mappings.find(mapping => {
    const mappingName = normalize(mapping.name)
    const mappingVineyard = normalize(mapping.vineyard)
    
    // Name must partially match
    const nameMatches = 
      normalizedName.includes(mappingName) ||
      mappingName.includes(normalizedName)
    
    // Vineyard must match
    const vineyardMatches = 
      normalizedVineyard === mappingVineyard ||
      normalizedVineyard.includes(mappingVineyard) ||
      mappingVineyard.includes(normalizedVineyard)
    
    return nameMatches && vineyardMatches
  })
  
  if (partialMatch) {
    console.log(`✅ Found partial wine image override for: ${vineyard} ${wineName}`)
    return partialMatch.imageUrl
  }
  
  return null
}

/**
 * Force reload the JSON overrides (useful after editing the file)
 */
export function reloadOverrides(): void {
  cachedOverrides = null
  cacheTime = 0
  getAllMappings() // Trigger reload
}

/**
 * Get the count of loaded overrides (for debugging)
 */
export function getOverrideCount(): number {
  return getAllMappings().length
}
