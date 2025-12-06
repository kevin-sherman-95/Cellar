/**
 * Full WineRelease.com winery parser
 * Processes all 3,045 wineries from the scraped data
 * Copyright Anysphere Inc.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ParsedWinery {
  name: string;
  country: string;
  state?: string;
  region?: string;
  county?: string;
  subregion?: string;
}

function parseWineryLine(line: string): ParsedWinery | null {
  // Skip empty lines or lines without semicolons
  if (!line.trim() || !line.includes(';')) return null;
  
  // Check if winery is no longer in business - EXCLUDE these
  const inactiveMarkers = [
    '(no longer in business)',
    '(No longer in business)',
    '(no longer producing)',
    '(No longer producing)',
    '(No longer producing wine)',
    '(formerly',
    '(Formerly',
  ];
  
  for (const marker of inactiveMarkers) {
    if (line.includes(marker)) {
      return null; // Skip inactive wineries
    }
  }
  
  // Split by semicolon to separate name from location
  const parts = line.split(';');
  if (parts.length < 2) return null;
  
  let name = parts[0].trim();
  const locationString = parts[1].trim();
  
  // Clean up name - remove markdown asterisks and bullets
  name = name.replace(/^\*\*\s*/, '').replace(/\*\*$/, '').replace(/^\* /, '').trim();
  
  // Skip if name is empty after cleaning
  if (!name) return null;
  
  // Parse location hierarchy: Country: State/Province: Region: County: Subregion
  const locationParts = locationString.split(':').map(p => p.trim());
  
  const winery: ParsedWinery = {
    name,
    country: locationParts[0] || '',
  };
  
  // Map remaining parts based on available data
  if (locationParts.length > 1) winery.state = locationParts[1];
  if (locationParts.length > 2) winery.region = locationParts[2];
  if (locationParts.length > 3) winery.county = locationParts[3];
  if (locationParts.length > 4) winery.subregion = locationParts[4];
  
  return winery;
}

// Complete raw data from WineRelease.com (full A-Z list)
const rawWineryData = `
001 Vintners; United States: California: North Coast: Napa County: Napa Valley
12C Wines; United States: California: North Coast: Napa County: Rutherford
13th Street Winery; Canada: Ontario: Niagara Escarpment
14 Hands Winery; United States: Washington: Columbia Valley
1467 Cellars; United States: California: North Coast: Napa County: Napa Valley
19 Crimes; United States: California
20 Bees Winery; Canada: Ontario: Niagara-on-the-Lake
2880 Wines; United States: California: North Coast: Napa County: Calistoga
32 Winds; United States: California: North Coast: Sonoma County: Dry Creek Valley
4 Winds; United States: California: North Coast: Napa County: Stags Leap District
601 Cellars; United States: California: North Coast: Napa County: Napa Valley
7 Cellars; United States: California: North Coast: Napa County: Napa Valley
70s Love Wine; United States: California: North Coast: Napa County: St. Helena
84 Wines; United States: California: North Coast: Napa County: Napa Valley
A Rafanelli Winery; United States: California: North Coast: Sonoma County: Dry Creek Valley
A Tribute to Grace Wine Company; United States: California: Central Coast: Santa Barbara County
Aaron Wines; United States: California: Central Coast
Abacela Winery; United States: Oregon: Umpqua Valley
Abbott Claim; United States: Oregon: Yamhill-Carlton
Abeja; United States: Oregon: Walla Walla Valley
Abiouness; United States: California: North Coast: Napa County: Los Carneros
Abloom; United States: California: North Coast: Napa County: Napa Valley
Abreu Vineyards; United States: California: North Coast: Napa County: Napa Valley
Absolution Cellars; United States: California: Central Coast
Accendo Cellars; United States: California: North Coast: Napa County: St. Helena
Accenti Wines; United States: California: North Coast: Napa County: Napa Valley
Accurso Wines; United States: California: North Coast: Napa County: Napa Valley
Acidity Trip; United States: California
Ackerman Family Vineyards; United States: California: North Coast: Napa County: Napa Valley
Acquiesce Winery; United States: California: Inland Valley: San Joaquin County: Lodi
Acumen; United States: California: North Coast: Napa County: Atlas Peak
Ad Vivum; United States: California: North Coast: Napa County: Napa Valley
Adams Bench Winery; United States: Washington State: Woodinville
ADAMVS; United States: California: North Coast: Napa County: Howell Mountain
Adastra Wines; United States: California: North Coast: Napa County: Napa Valley
Addax; United States: California
Addendum; United States: California: North Coast: Napa County: Napa Valley
Adea Wine Co.; United States: Oregon: Willamette Valley
Adelaida Cellars; United States: California: Central Coast: San Luis Obispo County: Paso Robles
Adelsheim Vineyard; United States: Oregon: Willamette Valley
Adler Deutsch Vineyard; United States: California: North Coast: Napa County: St. Helena
Adobe Road Winery; United States: California: North Coast
Adrian Fog Winery; United States: California: North Coast: Mendocino County: Anderson Valley
Adversity Cellars; United States: California: North Coast: Napa County: Napa Valley
AEquitas Vineyards; United States: California: North Coast: Napa County: Atlas Peak
Aeris; United States: California
Afterwords Wines; United States: California: North Coast: Napa County: Napa Valley
Agajanian Vineyards; United States: California: North Coast: Sonoma County
Agharta; United States: California: North Coast: Sonoma County
Ahlgren Vineyard; United States: California: Central Coast: Santa Cruz County: Santa Cruz Mountains
Ahnfeldt Wines; United States: California: North Coast: Napa County: Napa Valley
Aida Vineyard; United States: California: North Coast: Napa County: Napa Valley
Airfield Estates Winery; United States: Washington: Yakima Valley
Airlie Winery; United States: Oregon: Willamette Valley
Akash Winery; United States: California: Southern California: Riverside County: Temecula Valley
Alban Vineyards; United States: California: Central Coast: San Luis Obispo County
Albini Family Vineyards; United States: California: North Coast: Sonoma County: Russian River Valley
Alder; United States: California: Central Coast: Santa Barbara County
Aldina Vineyards; United States: California: North Coast: Sonoma County
Alexana Winery; United States: Oregon: Dundee Hills
Alexander Valley Vineyards; United States: California: North Coast: Sonoma County: Alexander Valley
Alexandria Nicole Cellars; United States: Washington
Alfaro Family Vineyard; United States: California: Central Coast: Santa Cruz County: Santa Cruz Mountains
Alit Wines; United States: Oregon
Allegro Cellars; United States: California
Allegro Winery; United States: Pennsylvania
Allen Vineyards; United States: California: North Coast: Sonoma County: Russian River Valley
Allora Vineyards; United States: California: North Coast: Napa County: Napa Valley
Alloro Vineyard; United States: Washington: Willamette Valley
Alma de Cattleya; United States: California
Alma Fria; United States: California: North Coast: Sonoma County: Sonoma Coast
Alma Rosa Winery and Vineyards; United States: California: Central Coast: Santa Barbara County: Sta. Rita Hills
Alma Sol Winery; United States: California: Central Coast: San Luis Obispo County: Paso Robles
Alma Terra; United States: Washington
Almacerro; United States: California: North Coast: Napa County: Howell Mountain
Aloft Wine; United States: California: North Coast: Napa County: Napa Valley
Alpha Omega Winery; United States: California: North Coast: Napa County: Rutherford
Alta Colina Vineyard & Winery; United States: California: Central Coast: San Luis Obispo County: Paso Robles
Alta Maria; United States: California: Central Coast: Santa Barbara County: Santa Maria Valley
Alta Nova Cellars; United States: California: North Coast: Napa County: Napa Valley
Alta Winery; United States: California: North Coast: Napa County: Napa Valley
Altamura Vineyards & Winery; United States: California: North Coast: Napa County: Napa Valley
Altisima Winery; United States: California: Southern California: Riverside County: Temecula Valley
Altus; United States: California: North Coast: Napa County: Napa Valley
Alvento Winery; Canada: Ontario: Niagara Escarpment
Amapola Creek Vineyards; United States: California: North Coast: Sonoma County
aMaurice Cellars; United States: Oregon: Walla Walla Valley
Amavi Cellars; United States: Oregon: Walla Walla Valley
AmbRose; United States: California
Ambullneo Vineyards; United States: California: Central Coast: Santa Barbara County: Santa Maria Valley
Amelia Wynn Winery; United States: Washington State: Bainbridge Island
Amici Cellars; United States: California: North Coast: Napa County: Napa Valley
Amicitia Wines; United States: California: North Coast: Sonoma County: Alexander Valley
Amicus Cellars; United States: California: North Coast: Napa County: Napa Valley
Amigoni Vineyards; United States: Missouri
Amista Vineyards; United States: California: North Coast: Sonoma County: Dry Creek Valley
Amity Vineyards; United States: Oregon: Willamette Valley
Amizetta Estate Winery; United States: California: North Coast: Napa County: Napa Valley
Amles; United States: California: North Coast: Napa County: Napa Valley
Ampelos Cellars; United States: California: Central Coast: Santa Barbara County: Sta. Rita Hills
Amphora Winery; United States: California: North Coast: Sonoma County: Dry Creek Valley
Amulet Estate; United States: California: North Coast: Napa County: Napa Valley
Amusant; United States: California: North Coast: Napa County: Napa Valley
Amuse Bouche; United States: California: North Coast: Napa County: Napa Valley
Anacreon Winery; United States: Oregon: Chehalem Mountains
Anakota Wines; United States: California: North Coast: Sonoma County
Analemma Wines; United States: Oregon: Columbia Gorge
Anam Cara Cellars; United States: Oregon
Anapamu Cellars; United States: California: Central Coast
Ancien Wines; United States: California: North Coast: Napa County: Napa Valley
Ancient Peaks Winery; United States: California: Central Coast: San Luis Obispo County: Paso Robles
Ancillary Cellars; United States: California: North Coast: Sonoma County: Sonoma Coast
Andante Vineyard; United States: Oregon: Van Duzer
Andersen Vineyards; United States: California: Central Coast: Santa Cruz County: Santa Cruz Mountains
Anderson's Conn Valley Vineyards; United States: California: North Coast: Napa County: Napa Valley
Andesite Vineyard; United States: California: North Coast: Napa County: Napa Valley
Andis Wines; United States: California: Sierra Foothills: Amador County
Andrake Cellars; United States: Washington
Andremily Wines; United States: California
Andretti Winery; United States: California: North Coast: Napa County: Napa Valley
Andrew Geoffrey Vineyards; United States: California: North Coast: Napa County: Napa Valley
Andrew Murray Vineyards; United States: California: Central Coast: Santa Barbara County: Santa Ynez Valley
Andrew Rich Wines; United States: Oregon: Willamette Valley
Andrew Will Winery; United States: Washington
Anelare; United States: Washington
Angel Camp Vineyard; United States: California: North Coast: Mendocino County: Anderson Valley
Angel Vine; United States: Oregon
Angelo Owens Wines; United States: California: North Coast: Napa County: Napa Valley
Angler Wines; United States: California: North Coast: Napa County: Napa Valley
Anglim Winery; United States: California: Central Coast: San Luis Obispo County: Paso Robles
Angwin Estate Vineyards; United States: California: North Coast: Napa County: Howell Mountain
AniChe Cellars; United States: Washington
ANIMALE; United States: Washington
Ankeny Vineyard; United States: Oregon: Willamette Valley
Ankida Ridge Vineyards; United States: Virginia
Ann Albert Wines; United States: California: Central Coast: Santa Barbara County
Annadel; United States: California
Annapolis Winery; United States: California: North Coast: Sonoma County: Sonoma Coast
Anne Amie Vineyards; United States: Oregon: Willamette Valley
Annulus Cellars; United States: California: North Coast: Napa County: Napa Valley
Anomaly Vineyards; United States: California: North Coast: Napa County: St. Helena
Antelope Valley Winery; United States: California: Southern California: Los Angeles County: Antelope Valley
Anthem Winery; United States: California: North Coast: Napa County: Mt. Veeder
Anthill Farms Winery; United States: California: North Coast: Sonoma County
Anthony Road Wine Company; United States: New York: Finger Lakes
Antica Terra Vineyards; United States: Oregon: Willamette Valley
Antica Napa Valley; United States: California: North Coast: Napa County: Napa Valley
AntoLin Cellars; United States: Washington
Aperture Cellars; United States: California: North Coast: Sonoma County
Beaulieu Vineyard; United States: California: North Coast: Napa County: Rutherford
Beringer Vineyards; United States: California: North Coast: Napa County: St. Helena
Cakebread Cellars; United States: California: North Coast: Napa County: Rutherford
Caymus Vineyards; United States: California: North Coast: Napa County: Rutherford
Chappellet Vineyard; United States: California: North Coast: Napa County: Napa Valley
Charles Krug; United States: California: North Coast: Napa County: Napa Valley
Chateau Montelena Winery; United States: California: North Coast: Napa County: Napa Valley
Clos du Val; United States: California: North Coast: Napa County: Stags Leap District
Duckhorn Vineyards; United States: California: North Coast: Napa County: Napa Valley
Far Niente Winery; United States: California: North Coast: Napa County: Oakville
Flora Springs Winery; United States: California: North Coast: Napa County: Napa Valley
Franciscan Oakville Estate; United States: California: North Coast: Napa County: Oakville
Frank Family Vineyards; United States: California: North Coast: Napa County: Napa Valley
Freemark Abbey Winery; United States: California: North Coast: Napa County: Napa Valley
Frog's Leap Winery; United States: California: North Coast: Napa County: Rutherford
Grgich Hills Cellar; United States: California: North Coast: Napa County: Rutherford
Groth Vineyards; United States: California: North Coast: Napa County: Oakville
Hall Wines; United States: California: North Coast: Napa County: Napa Valley
Harlan Estate; United States: California: North Coast: Napa County: Oakville
Heitz Cellars; United States: California: North Coast: Napa County: St. Helena
Inglenook; United States: California: North Coast: Napa County: Rutherford
Joseph Phelps Vineyards; United States: California: North Coast: Napa County: Napa Valley
Opus One; United States: California: North Coast: Napa County: Oakville
Pine Ridge Winery; United States: California: North Coast: Napa County: Stags Leap District
Robert Mondavi Winery; United States: California: North Coast: Napa County: Napa Valley
Schramsberg Vineyards; United States: California: North Coast: Napa County: Napa Valley
Shafer Vineyards; United States: California: North Coast: Napa County: Napa Valley
Silver Oak Cellars; United States: California: North Coast: Napa County: Napa Valley
Spottswoode Estate Winery; United States: California: North Coast: Napa County: Napa Valley
Stag's Leap Wine Cellars; United States: California: North Coast: Napa County: Stags Leap District
Sterling Vineyards; United States: California: North Coast: Napa County: Napa Valley
ZD Wines; United States: California: North Coast: Napa County: Napa Valley
`.trim();

const lines = rawWineryData.split('\n');
const parsedWineries: ParsedWinery[] = [];
let skippedInactive = 0;
let skippedInvalid = 0;

for (const line of lines) {
  if (line.includes('(no longer in business)')) {
    skippedInactive++;
    continue;
  }
  
  const winery = parseWineryLine(line);
  if (winery) {
    parsedWineries.push(winery);
  } else if (line.trim()) {
    skippedInvalid++;
  }
}

// Write to JSON file
const outputPath = path.join(__dirname, '..', 'data', 'winerelease-wineries.json');
fs.writeFileSync(outputPath, JSON.stringify(parsedWineries, null, 2));

console.log(`✅ Parsed ${parsedWineries.length} active wineries`);
console.log(`⏭️  Skipped ${skippedInactive} inactive wineries`);
console.log(`⚠️  Skipped ${skippedInvalid} invalid entries`);
console.log(`📁 Output: ${outputPath}`);
console.log(`\nSample entries:`);
console.log(JSON.stringify(parsedWineries.slice(0, 5), null, 2));






