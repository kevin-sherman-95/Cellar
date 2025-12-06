/**
 * Vivino Explore Page Scraper
 * Scrapes wines from a Vivino explore page URL
 * Copyright Anysphere Inc.
 * 
 * Usage:
 *   1. Navigate to the Vivino explore page in a browser
 *   2. Scroll through to load all wines
 *   3. Save the page HTML or take snapshots
 *   4. Run this script to extract wines
 * 
 * OR use browser automation (Puppeteer/Playwright) to automate steps 1-3
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { extractWinesFromSnapshot, mergeWines, loadExistingWines, saveWines } from './vivino-scraper-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ScrapeOptions {
  url: string;
  outputPath?: string;
  snapshotFiles?: string[];
  maxScrolls?: number;
}

/**
 * Process snapshot files to extract wines
 */
async function processSnapshots(snapshotFiles: string[], outputPath: string): Promise<number> {
  let allWines: any[] = [];
  const existingWines = loadExistingWines(outputPath);

  for (const snapshotFile of snapshotFiles) {
    if (!fs.existsSync(snapshotFile)) {
      console.log(`⚠️  Snapshot file not found: ${snapshotFile}`);
      continue;
    }

    console.log(`📖 Processing snapshot: ${snapshotFile}`);
    const snapshotData = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8'));
    
    const wines = extractWinesFromSnapshot(snapshotData);
    console.log(`   Found ${wines.length} wines`);
    
    allWines = mergeWines(allWines, wines);
  }

  // Merge with existing wines
  const finalWines = mergeWines(existingWines, allWines);
  saveWines(finalWines, outputPath);

  return finalWines.length;
}

/**
 * Main scraping function
 */
async function scrapeVivinoExplore(options: ScrapeOptions): Promise<void> {
  const {
    url,
    outputPath = path.join(__dirname, '..', 'data', 'vivino-wines.json'),
    snapshotFiles = [],
  } = options;

  console.log('🍷 Vivino Explore Page Scraper');
  console.log(`📖 URL: ${url}\n`);

  if (snapshotFiles.length > 0) {
    console.log('📸 Processing snapshot files...\n');
    const totalWines = await processSnapshots(snapshotFiles, outputPath);
    console.log(`\n✅ Total wines in database: ${totalWines}`);
    return;
  }

  console.log('⚠️  No snapshot files provided.');
  console.log('\n📋 To scrape wines from this URL:');
  console.log('\n   Option 1: Manual Snapshot Method');
  console.log('   1. Open the URL in a browser');
  console.log('   2. Scroll through the page to load all wines');
  console.log('   3. Take browser snapshots (or save page HTML)');
  console.log('   4. Run this script with snapshot files:');
  console.log(`      npx tsx scripts/scrape-vivino-explore.ts "${url}" --snapshots snapshot1.json snapshot2.json ...`);
  
  console.log('\n   Option 2: Browser Automation (Recommended)');
  console.log('   Use Puppeteer or Playwright to:');
  console.log('   1. Navigate to the URL');
  console.log('   2. Wait for wines to load');
  console.log('   3. Scroll to load more wines');
  console.log('   4. Extract wine data from the DOM');
  console.log('   5. Save to JSON format');
  
  console.log('\n   Option 3: Use Existing Data');
  console.log('   If you have existing vivino-wines.json, you can import it:');
  console.log('      npm run db:seed-vivino');
  
  console.log('\n💡 Note: Vivino pages load wines dynamically via JavaScript.');
  console.log('   The browser automation tools need to wait for content to load.');
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/scrape-vivino-explore.ts <vivino-url> [options]');
    console.log('\nOptions:');
    console.log('  --snapshots <file1> [file2] ...  Process snapshot files');
    console.log('  --output <path>                  Output JSON file path');
    console.log('\nExample:');
    console.log('  npx tsx scripts/scrape-vivino-explore.ts "https://www.vivino.com/en/explore?e=..." --snapshots snapshot1.json snapshot2.json');
    process.exit(1);
  }

  const url = args[0];
  const outputPathIndex = args.indexOf('--output');
  const outputPath = outputPathIndex >= 0 && args[outputPathIndex + 1] 
    ? args[outputPathIndex + 1] 
    : undefined;

  const snapshotsIndex = args.indexOf('--snapshots');
  const snapshotFiles = snapshotsIndex >= 0 
    ? args.slice(snapshotsIndex + 1).filter(f => !f.startsWith('--'))
    : [];

  scrapeVivinoExplore({ url, outputPath, snapshotFiles })
    .then(() => {
      console.log('\n✅ Done!');
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { scrapeVivinoExplore, processSnapshots };






