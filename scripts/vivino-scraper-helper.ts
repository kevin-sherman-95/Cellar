/**
 * Vivino Scraper Helper
 * Parses wine data from browser snapshots and manages the wine collection
 * Copyright Anysphere Inc.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ScrapedWine {
  name: string;
  vineyard: string;
  region: string;
  country: string;
  varietal: string;
  vintage: number | null;
  description: string | null;
  alcoholContent: number | null;
  image: string | null;
  vivinoRating: number | null;
  vivinoRatingCount: number | null;
  price: number | null;
}

export interface VivinoScrapedData {
  wines: ScrapedWine[];
  scrapedAt: string;
  source: string;
}

// Common wine varietals to detect
const VARIETALS = [
  'Cabernet Sauvignon', 'Pinot Noir', 'Merlot', 'Chardonnay', 'Sauvignon Blanc',
  'Malbec', 'Syrah', 'Shiraz', 'Zinfandel', 'Riesling', 'Tempranillo',
  'Sangiovese', 'Nebbiolo', 'Grenache', 'Mourvedre', 'Viognier',
  'Pinot Grigio', 'Pinot Gris', 'Gewurztraminer', 'Semillon', 'Chenin Blanc',
  'Cabernet Franc', 'Petit Verdot', 'Carmenere', 'Petite Sirah', 'Barbera',
  'Primitivo', 'Prosecco', 'Champagne', 'Cava', 'Brut', 'Rosé', 'Rose',
  'Red Blend', 'White Blend', 'Sparkling'
];

/**
 * Parse wine link text from Vivino's accessibility tree
 * Example: "Save 33% 4.4 ( 1172 rating ) $39.99 $60 Viña Cobos Bramare Malbec Lujan de Cuyo 2022 Lujan de Cuyo , Argentina Great Value"
 */
export function parseWineLinkText(linkText: string): ScrapedWine | null {
  try {
    let text = linkText.trim();
    
    // Remove "Save X%" prefix if present
    text = text.replace(/^Save \d+%\s*/, '');
    
    // Remove value badges at the end
    text = text.replace(/\s*(Great Value|Good Value|Amazing Value!)\s*$/i, '');
    
    // Extract rating (e.g., "4.4")
    const ratingMatch = text.match(/^(\d+\.\d+)\s*\(/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
    
    // Extract rating count (e.g., "1235 rating")
    const ratingCountMatch = text.match(/\(\s*([\d,]+)\s*rating\s*\)/);
    const ratingCount = ratingCountMatch ? parseInt(ratingCountMatch[1].replace(/,/g, '')) : null;
    
    // Remove rating info from text
    text = text.replace(/^\d+\.\d+\s*\(\s*[\d,]+\s*rating\s*\)\s*/, '');
    
    // Extract prices
    const priceMatches = text.match(/\$[\d,.]+/g);
    const price = priceMatches && priceMatches.length > 0 
      ? parseFloat(priceMatches[0].replace(/[$,]/g, '')) 
      : null;
    
    // Remove prices from text
    text = text.replace(/\$[\d,.]+/g, '').trim();
    
    // The remaining text should be: "Wine Name Year Region , Country"
    const parts = text.split(',').map(p => p.trim());
    
    if (parts.length < 2) {
      return null;
    }
    
    // Last part is country
    const country = mapCountryName(parts[parts.length - 1].trim());
    
    // Second to last part contains region (but might also be part of wine name)
    const winePart = parts.slice(0, -1).join(', ').trim();
    
    // Extract vintage year
    const vintageMatch = winePart.match(/\b(19|20)\d{2}\b/);
    const vintage = vintageMatch ? parseInt(vintageMatch[0]) : null;
    
    // Try to find region - it's usually the last word(s) before country
    // Common pattern: "Wine Name 2022 Region Name"
    const regionMatch = winePart.match(/\d{4}\s+(.+)$/);
    let region = regionMatch ? regionMatch[1].trim() : '';
    
    // If no year, the last words before the comma are the region
    if (!region && parts.length >= 2) {
      region = parts[parts.length - 2].trim();
    }
    
    // Get wine name (everything before the region)
    let wineName = winePart;
    if (region && wineName.endsWith(region)) {
      wineName = wineName.slice(0, -region.length).trim();
    }
    
    // Detect varietal
    const varietal = detectVarietal(wineName);
    
    // Extract winery name
    const winery = extractWinery(wineName, varietal);
    
    return {
      name: cleanWineName(wineName, vintage),
      vineyard: winery,
      region: region || 'Unknown',
      country: country,
      varietal: varietal,
      vintage: vintage,
      description: null,
      alcoholContent: null,
      image: null,
      vivinoRating: rating,
      vivinoRatingCount: ratingCount,
      price: price
    };
  } catch (error) {
    console.error('Error parsing wine link:', linkText, error);
    return null;
  }
}

/**
 * Detect varietal from wine name
 */
function detectVarietal(name: string): string {
  const lowerName = name.toLowerCase();
  
  for (const v of VARIETALS) {
    if (lowerName.includes(v.toLowerCase())) {
      return v;
    }
  }
  
  // Check for common abbreviations
  if (lowerName.includes('cab sauv')) return 'Cabernet Sauvignon';
  if (lowerName.includes('pinot n')) return 'Pinot Noir';
  if (lowerName.includes('sauv blanc')) return 'Sauvignon Blanc';
  
  return 'Red Blend'; // Default
}

/**
 * Extract winery name from full wine name
 */
function extractWinery(fullName: string, varietal: string): string {
  // Remove vintage year
  let name = fullName.replace(/\b(19|20)\d{2}\b/g, '').trim();
  
  // Try to find where the varietal starts
  const varietalIndex = name.toLowerCase().indexOf(varietal.toLowerCase());
  
  if (varietalIndex > 0) {
    return name.slice(0, varietalIndex).trim();
  }
  
  // Otherwise take first 2-3 words
  const words = name.split(' ');
  if (words.length >= 3) {
    return words.slice(0, Math.min(3, words.length - 1)).join(' ');
  }
  
  return words[0] || 'Unknown';
}

/**
 * Clean wine name by adding vintage if missing
 */
function cleanWineName(name: string, vintage: number | null): string {
  // Remove extra spaces
  name = name.replace(/\s+/g, ' ').trim();
  
  // Add vintage if present and not already in name
  if (vintage && !name.includes(vintage.toString())) {
    name = `${name} ${vintage}`;
  }
  
  return name;
}

/**
 * Map country names to standard format
 */
function mapCountryName(country: string): string {
  const countryMap: Record<string, string> = {
    'United State': 'United States',
    'United States': 'United States',
    'USA': 'United States',
    'U.S.': 'United States',
    'U.S.A.': 'United States',
    'Argentina': 'Argentina',
    'Portugal': 'Portugal',
    'France': 'France',
    'Italy': 'Italy',
    'Spain': 'Spain',
    'Australia': 'Australia',
    'Chile': 'Chile',
    'New Zealand': 'New Zealand',
    'Germany': 'Germany',
    'South Africa': 'South Africa',
  };
  
  return countryMap[country] || country;
}

/**
 * Extract wines from a browser snapshot JSON or YAML
 */
export function extractWinesFromSnapshot(snapshotJson: any): ScrapedWine[] {
  const wines: ScrapedWine[] = [];
  
  function traverseNode(node: any) {
    if (!node) return;
    
    // Look for link nodes with wine data
    if (node.role === 'link' && node.name && 
        (node.name.includes('rating') || node.name.includes('$')) &&
        !node.name.includes('page') && 
        !node.name.includes('vivino.com')) {
      const wine = parseWineLinkText(node.name);
      // Relax the requirement - allow wines without price for now
      if (wine && wine.name) {
        wines.push(wine);
      }
    }
    
    // Traverse children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverseNode(child);
      }
    }
  }
  
  // Handle YAML array format (starts with array)
  if (Array.isArray(snapshotJson)) {
    for (const item of snapshotJson) {
      traverseNode(item);
    }
  }
  // Start traversal from root
  else if (snapshotJson.pageState && snapshotJson.pageState.snapshot) {
    traverseNode(snapshotJson.pageState.snapshot);
  } else if (snapshotJson.snapshot) {
    traverseNode(snapshotJson.snapshot);
  } else {
    traverseNode(snapshotJson);
  }
  
  return wines;
}

/**
 * Load existing wines from JSON file
 */
export function loadExistingWines(filePath: string): ScrapedWine[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as VivinoScrapedData;
  return data.wines;
}

/**
 * Save wines to JSON file
 */
export function saveWines(wines: ScrapedWine[], filePath: string): void {
  const data: VivinoScrapedData = {
    wines: wines,
    scrapedAt: new Date().toISOString(),
    source: 'vivino.com'
  };
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${wines.length} wines to ${filePath}`);
}

/**
 * Merge new wines with existing, deduplicating by name + vintage
 */
export function mergeWines(existing: ScrapedWine[], newWines: ScrapedWine[]): ScrapedWine[] {
  const seen = new Map<string, ScrapedWine>();
  
  // Add existing wines
  for (const wine of existing) {
    const key = `${wine.name.toLowerCase()}-${wine.vintage || 'nv'}`;
    seen.set(key, wine);
  }
  
  // Add new wines (updates existing if same key)
  let added = 0;
  for (const wine of newWines) {
    const key = `${wine.name.toLowerCase()}-${wine.vintage || 'nv'}`;
    if (!seen.has(key)) {
      added++;
    }
    seen.set(key, wine);
  }
  
  console.log(`📊 Merged: ${added} new wines added, ${seen.size} total`);
  return Array.from(seen.values());
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'parse' && args[1]) {
    // Parse a snapshot file
    const snapshotPath = args[1];
    const outputPath = args[2] || path.join(__dirname, '..', 'data', 'vivino-wines.json');
    
    console.log(`📖 Reading snapshot from ${snapshotPath}`);
    const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    
    const newWines = extractWinesFromSnapshot(snapshotData);
    console.log(`🍷 Extracted ${newWines.length} wines from snapshot`);
    
    const existingWines = loadExistingWines(outputPath);
    const mergedWines = mergeWines(existingWines, newWines);
    
    saveWines(mergedWines, outputPath);
  } else {
    console.log('Usage: ts-node vivino-scraper-helper.ts parse <snapshot.json> [output.json]');
  }
}
