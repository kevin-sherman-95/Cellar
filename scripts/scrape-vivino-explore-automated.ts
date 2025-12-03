/**
 * Automated Vivino Explore Page Scraper
 * Scrapes wines from a Vivino explore page URL using browser automation
 * Copyright Anysphere Inc.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { extractWinesFromSnapshot, mergeWines, loadExistingWines, saveWines, ScrapedWine } from './vivino-scraper-helper.js';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface ScrapeOptions {
  url: string;
  outputPath?: string;
  maxScrolls?: number;
  scrollDelay?: number;
  seedToDatabase?: boolean;
}

/**
 * Extract wines from a snapshot JSON file
 */
function extractWinesFromSnapshotFile(snapshotPath: string): ScrapedWine[] {
  if (!fs.existsSync(snapshotPath)) {
    console.log(`⚠️  Snapshot file not found: ${snapshotPath}`);
    return [];
  }

  console.log(`📖 Processing snapshot: ${snapshotPath}`);
  const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  
  const wines = extractWinesFromSnapshot(snapshotData);
  console.log(`   Found ${wines.length} wines`);
  
  return wines;
}

/**
 * Seed wines to database
 */
async function seedWinesToDatabase(wines: ScrapedWine[]): Promise<void> {
  console.log('\n🍷 Seeding wines to database...');
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const wine of wines) {
    try {
      // Check if wine already exists (by name and vintage)
      const existingWine = await prisma.wine.findFirst({
        where: {
          AND: [
            { name: wine.name },
            { vintage: wine.vintage }
          ]
        }
      });

      if (existingWine) {
        // Update existing wine if it has less data
        const needsUpdate = !existingWine.description && wine.description;

        if (needsUpdate) {
          await prisma.wine.update({
            where: { id: existingWine.id },
            data: {
              description: wine.description,
              alcoholContent: wine.alcoholContent || existingWine.alcoholContent,
              image: wine.image || existingWine.image
            }
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new wine
        await prisma.wine.create({
          data: {
            name: wine.name,
            vineyard: wine.vineyard,
            region: wine.region,
            country: wine.country,
            varietal: wine.varietal,
            vintage: wine.vintage,
            description: wine.description,
            alcoholContent: wine.alcoholContent,
            image: wine.image
          }
        });
        created++;
      }
    } catch (error) {
      errors++;
      console.error(`  ❌ Error importing ${wine.name}:`, error);
    }
  }

  console.log('\n📈 Database Import Summary:');
  console.log(`   ✅ Created: ${created} wines`);
  console.log(`   ✏️  Updated: ${updated} wines`);
  console.log(`   ⏭️  Skipped: ${skipped} wines (already exist)`);
  console.log(`   ❌ Errors: ${errors}`);
}

/**
 * Main scraping function
 */
async function scrapeVivinoExploreAutomated(options: ScrapeOptions): Promise<void> {
  const {
    url,
    outputPath = path.join(__dirname, '..', 'data', 'vivino-wines.json'),
    maxScrolls = 50,
    scrollDelay = 2000,
    seedToDatabase = true
  } = options;

  console.log('🍷 Automated Vivino Explore Page Scraper');
  console.log(`📖 URL: ${url}\n`);

  // Instructions for manual browser automation
  console.log('📋 Instructions:');
  console.log('   1. This script expects snapshot files from browser automation');
  console.log('   2. Navigate to the URL in a browser');
  console.log('   3. Scroll through the page to load all wines');
  console.log('   4. Take snapshots periodically (every few scrolls)');
  console.log('   5. Save snapshots as JSON files');
  console.log('   6. Run this script with snapshot files:\n');
  console.log(`      npx tsx scripts/scrape-vivino-explore-automated.ts "${url}" --snapshots snapshot1.json snapshot2.json ...`);
  console.log('\n   Or use the browser MCP tools to automate this process.\n');

  // Check if snapshot files are provided via command line
  const args = process.argv.slice(2);
  const snapshotsIndex = args.indexOf('--snapshots');
  const snapshotFiles = snapshotsIndex >= 0 
    ? args.slice(snapshotsIndex + 1).filter(f => !f.startsWith('--'))
    : [];

  if (snapshotFiles.length > 0) {
    console.log('📸 Processing snapshot files...\n');
    
    let allWines: ScrapedWine[] = [];
    const existingWines = loadExistingWines(outputPath);

    for (const snapshotFile of snapshotFiles) {
      const wines = extractWinesFromSnapshotFile(snapshotFile);
      allWines = mergeWines(allWines, wines);
    }

    // Merge with existing wines
    const finalWines = mergeWines(existingWines, allWines);
    saveWines(finalWines, outputPath);

    console.log(`\n✅ Total wines in database: ${finalWines.length}`);

    // Seed to database if requested
    if (seedToDatabase) {
      await seedWinesToDatabase(finalWines);
    }

    return;
  }

  console.log('⚠️  No snapshot files provided.');
  console.log('   Please provide snapshot files using --snapshots flag.');
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/scrape-vivino-explore-automated.ts <vivino-url> [options]');
    console.log('\nOptions:');
    console.log('  --snapshots <file1> [file2] ...  Process snapshot files');
    console.log('  --output <path>                  Output JSON file path');
    console.log('  --no-seed                        Skip database seeding');
    console.log('\nExample:');
    console.log('  npx tsx scripts/scrape-vivino-explore-automated.ts "https://www.vivino.com/en/explore?e=..." --snapshots snapshot1.json snapshot2.json');
    process.exit(1);
  }

  const url = args[0];
  const outputPathIndex = args.indexOf('--output');
  const outputPath = outputPathIndex >= 0 && args[outputPathIndex + 1] 
    ? args[outputPathIndex + 1] 
    : undefined;

  const seedToDatabase = args.indexOf('--no-seed') === -1;

  scrapeVivinoExploreAutomated({ url, outputPath, seedToDatabase })
    .then(async () => {
      await prisma.$disconnect();
      console.log('\n✅ Done!');
    })
    .catch(async (error) => {
      await prisma.$disconnect();
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { scrapeVivinoExploreAutomated, seedWinesToDatabase };




