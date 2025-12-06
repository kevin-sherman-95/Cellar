'use server'

import { ExternalWine } from './wine-api'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Load wine data from CSV or JSON files
 * Place your wine dataset files in the /data directory
 * Supported formats: CSV, JSON
 */

interface CSVWineRow {
  name?: string
  vineyard?: string
  producer?: string
  winery?: string
  region?: string
  subregion?: string
  country?: string
  varietal?: string
  grape?: string
  vintage?: string
  year?: string
  description?: string
  alcoholContent?: string
  abv?: string
  image?: string
  price?: string
  rating?: string
}

/**
 * Parse CSV content and convert to ExternalWine array
 */
function parseCSV(csvContent: string): ExternalWine[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const wines: ExternalWine[] = []

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: CSVWineRow = {}
    
    headers.forEach((header, index) => {
      row[header as keyof CSVWineRow] = values[index] || undefined
    })

    // Map CSV columns to ExternalWine format
    const wine: ExternalWine = {
      name: row.name || row.vineyard || 'Unknown Wine',
      vineyard: row.vineyard || row.producer || row.winery || 'Unknown',
      region: row.subregion || row.region || 'Unknown',
      country: row.country || 'United States',
      varietal: row.varietal || row.grape || 'Unknown',
      vintage: row.vintage || row.year ? parseInt(row.vintage || row.year || '0') : undefined,
      description: row.description,
      alcoholContent: row.alcoholContent || row.abv ? parseFloat(row.alcoholContent || row.abv || '0') : undefined,
      image: row.image,
      price: row.price ? parseFloat(row.price) : undefined,
      rating: row.rating ? parseFloat(row.rating) : undefined,
      source: 'Dataset',
    }

    // Only add wines with at least name and vineyard
    if (wine.name !== 'Unknown Wine' && wine.vineyard !== 'Unknown') {
      wines.push(wine)
    }
  }

  return wines
}

/**
 * Load wines from a JSON file
 */
async function loadJSONDataset(filePath: string): Promise<ExternalWine[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content)
    
    // Handle different JSON structures
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        name: item.name || item.wine || 'Unknown Wine',
        vineyard: item.vineyard || item.producer || item.winery || 'Unknown',
        region: item.subregion || item.region || 'Unknown',
        country: item.country || 'United States',
        varietal: item.varietal || item.grape || 'Unknown',
        vintage: item.vintage || item.year,
        description: item.description || item.notes,
        alcoholContent: item.alcoholContent || item.abv,
        image: item.image || item.label,
        price: item.price,
        rating: item.rating || item.score,
        source: 'Dataset',
      }))
    }
    
    // Handle object with wines array
    if (data.wines && Array.isArray(data.wines)) {
      return data.wines.map((item: any) => ({
        name: item.name || item.wine || 'Unknown Wine',
        vineyard: item.vineyard || item.producer || item.winery || 'Unknown',
        region: item.subregion || item.region || 'Unknown',
        country: item.country || 'United States',
        varietal: item.varietal || item.grape || 'Unknown',
        vintage: item.vintage || item.year,
        description: item.description || item.notes,
        alcoholContent: item.alcoholContent || item.abv,
        image: item.image || item.label,
        price: item.price,
        rating: item.rating || item.score,
        source: 'Dataset',
      }))
    }
    
    return []
  } catch (error) {
    console.error(`Error loading JSON dataset from ${filePath}:`, error)
    return []
  }
}

/**
 * Load wines from a CSV file
 */
async function loadCSVDataset(filePath: string): Promise<ExternalWine[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return parseCSV(content)
  } catch (error) {
    console.error(`Error loading CSV dataset from ${filePath}:`, error)
    return []
  }
}

/**
 * Load all wine datasets from the data directory
 */
export async function loadWineDatasets(): Promise<ExternalWine[]> {
  const dataDir = join(process.cwd(), 'data')
  const allWines: ExternalWine[] = []

  try {
    const { readdir } = await import('fs/promises')
    const files = await readdir(dataDir)

    for (const file of files) {
      const filePath = join(dataDir, file)
      
      if (file.endsWith('.json')) {
        const wines = await loadJSONDataset(filePath)
        allWines.push(...wines)
      } else if (file.endsWith('.csv')) {
        const wines = await loadCSVDataset(filePath)
        allWines.push(...wines)
      }
    }
  } catch (error) {
    // Data directory doesn't exist or is empty - that's okay
    console.log('No data directory found or empty. Create /data directory and add CSV/JSON files.')
  }

  return allWines
}

/**
 * Search loaded datasets for wines matching query and filters
 */
export async function searchWineDatasets(
  query: string,
  filters?: {
    varietal?: string
    region?: string
    country?: string
    vintage?: number
  }
): Promise<ExternalWine[]> {
  const allWines = await loadWineDatasets()
  
  if (allWines.length === 0) {
    return []
  }

  // Filter wines based on query and filters
  const filtered = allWines.filter((wine) => {
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
    if (filters?.varietal && !wine.varietal.toLowerCase().includes(filters.varietal.toLowerCase())) {
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








