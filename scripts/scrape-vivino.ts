/**
 * Vivino Wine Scraper
 * Parses wine data from Vivino's explore page snapshots
 * Copyright Anysphere Inc.
 */

import * as fs from 'fs';
import * as path from 'path';

// Wine data interface matching our Prisma schema
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

/**
 * Parse a wine link text from Vivino's accessibility tree
 * Example: "Save 20% 4.4 ( 1235 rating ) $39.99 $50 Viña Cobos Bramare Malbec Uco Valley 2022 Uco Valley , Argentina Great Value"
 */
export function parseWineLinkText(linkText: string): ScrapedWine | null {
  try {
    // Clean up the text
    let text = linkText.trim();
    
    // Remove "Save X%" prefix if present
    text = text.replace(/^Save \d+%\s*/, '');
    
    // Remove value badges at the end
    text = text.replace(/\s*(Great Value|Good Value|Amazing Value!)\s*$/i, '');
    
    // Extract rating (e.g., "4.4")
    const ratingMatch = text.match(/^(\d+\.\d+)\s*\(/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
    
    // Extract rating count (e.g., "1235 rating")
    const ratingCountMatch = text.match(/\(\s*(\d+)\s*rating\s*\)/);
    const ratingCount = ratingCountMatch ? parseInt(ratingCountMatch[1]) : null;
    
    // Remove rating info from text
    text = text.replace(/^\d+\.\d+\s*\(\s*\d+\s*rating\s*\)\s*/, '');
    
    // Extract prices (can have sale price + original price, or just one price)
    const priceMatches = text.match(/\$[\d,.]+/g);
    const price = priceMatches && priceMatches.length > 0 
      ? parseFloat(priceMatches[0].replace(/[$,]/g, '')) 
      : null;
    
    // Remove prices from text
    text = text.replace(/\$[\d,.]+/g, '').trim();
    
    // The remaining text should be: "Wine Name Year Region , Country"
    // Split by comma to separate region/country info
    const parts = text.split(',').map(p => p.trim());
    
    if (parts.length < 2) {
      return null;
    }
    
    // Last part is country
    const country = mapCountryName(parts[parts.length - 1].trim());
    
    // Second to last part contains region
    const regionPart = parts[parts.length - 2].trim();
    
    // Everything before that is wine name (may include region in name)
    let wineName = parts.slice(0, -1).join(', ').trim();
    
    // Extract vintage year from wine name (typically 4 digit year at the end of the wine name portion)
    const vintageMatch = wineName.match(/\b(19|20)\d{2}\b/);
    const vintage = vintageMatch ? parseInt(vintageMatch[0]) : null;
    
    // Try to separate winery from wine name
    // Common patterns: "Winery Name Wine Type Year" or "Wine Name Year"
    const { winery, cleanName, varietal } = parseWineName(wineName);
    
    return {
      name: cleanName,
      vineyard: winery,
      region: regionPart,
      country: country,
      varietal: varietal,
      vintage: vintage,
      description: null, // Would need to visit detail page
      alcoholContent: null, // Would need to visit detail page
      image: null, // Set separately from img elements
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
 * Parse wine name to extract winery, clean name, and varietal
 */
function parseWineName(fullName: string): { winery: string; cleanName: string; varietal: string } {
  // Common wine varietals to detect
  const varietals = [
    'Cabernet Sauvignon', 'Pinot Noir', 'Merlot', 'Chardonnay', 'Sauvignon Blanc',
    'Malbec', 'Syrah', 'Shiraz', 'Zinfandel', 'Riesling', 'Tempranillo',
    'Sangiovese', 'Nebbiolo', 'Grenache', 'Mourvedre', 'Viognier',
    'Pinot Grigio', 'Pinot Gris', 'Gewurztraminer', 'Semillon', 'Chenin Blanc',
    'Cabernet Franc', 'Petit Verdot', 'Carmenere', 'Petite Sirah', 'Barbera',
    'Primitivo', 'Tinto', 'Reserva', 'Red Blend', 'White Blend'
  ];
  
  let detectedVarietal = 'Red Blend'; // Default
  
  for (const v of varietals) {
    if (fullName.toLowerCase().includes(v.toLowerCase())) {
      detectedVarietal = v;
      break;
    }
  }
  
  // Remove year from the name for cleaner parsing
  let name = fullName.replace(/\b(19|20)\d{2}\b/g, '').trim();
  
  // Try to find common winery name patterns
  // Often the first part before the varietal or specific wine name is the winery
  const parts = name.split(' ');
  
  // Simple heuristic: if name has more than 3 words, first 1-2 words might be winery
  let winery = '';
  let cleanName = fullName;
  
  if (parts.length >= 3) {
    // Look for patterns like "Winery Name Varietal" or "Winery Name Vineyard Varietal"
    const varietalIndex = parts.findIndex(p => 
      varietals.some(v => v.toLowerCase().split(' ')[0] === p.toLowerCase())
    );
    
    if (varietalIndex > 0) {
      winery = parts.slice(0, varietalIndex).join(' ');
    } else {
      // Take first 2 words as potential winery
      winery = parts.slice(0, Math.min(2, parts.length - 1)).join(' ');
    }
  }
  
  return {
    winery: winery || fullName.split(' ')[0] || 'Unknown',
    cleanName: fullName,
    varietal: detectedVarietal
  };
}

/**
 * Map abbreviated or alternate country names to full names
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
 * Parse wine image name from accessibility tree
 * Example: "Viña Cobos Bramare Malbec Uco Valley 2022"
 */
export function parseWineImageName(imageName: string): string {
  return imageName.trim();
}

/**
 * Save scraped wines to JSON file
 */
export function saveWinesToJson(wines: ScrapedWine[], outputPath: string): void {
  const data: VivinoScrapedData = {
    wines: wines,
    scrapedAt: new Date().toISOString(),
    source: 'vivino.com'
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${wines.length} wines to ${outputPath}`);
}

/**
 * Load existing wines from JSON file
 */
export function loadWinesFromJson(inputPath: string): ScrapedWine[] {
  if (!fs.existsSync(inputPath)) {
    return [];
  }
  
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as VivinoScrapedData;
  return data.wines;
}

/**
 * Deduplicate wines by name + vintage
 */
export function deduplicateWines(wines: ScrapedWine[]): ScrapedWine[] {
  const seen = new Set<string>();
  const unique: ScrapedWine[] = [];
  
  for (const wine of wines) {
    const key = `${wine.name.toLowerCase()}-${wine.vintage || 'nv'}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(wine);
    }
  }
  
  return unique;
}

// Main execution for standalone testing
if (require.main === module) {
  // Test parsing with sample data
  const testLinks = [
    "Save 20% 4.4 ( 1235 rating ) $39.99 $50 Viña Cobos Bramare Malbec Uco Valley 2022 Uco Valley , Argentina Great Value",
    "4.4 ( 111 rating ) $49.99 Argot Estate Vineyard Pinot Noir 2021 Sonoma Mountain , United State Great Value",
    "Save 33% 4.3 ( 4154 rating ) $39.99 $60 The Prisoner Cabernet Sauvignon 2021 Napa Valley , United State Good Value",
  ];
  
  console.log('Testing wine link parser:');
  for (const link of testLinks) {
    const wine = parseWineLinkText(link);
    console.log('\nInput:', link);
    console.log('Parsed:', JSON.stringify(wine, null, 2));
  }
}






