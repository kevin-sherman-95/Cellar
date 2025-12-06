/**
 * Process Vivino snapshot files and seed to database
 * Copyright Anysphere Inc.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { extractWinesFromSnapshot, mergeWines, loadExistingWines, saveWines, ScrapedWine } from './vivino-scraper-helper.js';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

/**
 * Extract wines from a snapshot file (JSON or YAML)
 */
function extractWinesFromSnapshotFile(snapshotPath: string): ScrapedWine[] {
  if (!fs.existsSync(snapshotPath)) {
    console.log(`⚠️  Snapshot file not found: ${snapshotPath}`);
    return [];
  }

  console.log(`📖 Processing snapshot: ${snapshotPath}`);
  
  let snapshotData: any;
  const fileContent = fs.readFileSync(snapshotPath, 'utf-8');
  
  // Try to parse as YAML first (browser logs are YAML)
  try {
    snapshotData = yaml.load(fileContent);
  } catch (yamlError) {
    // If YAML parsing fails, try JSON
    try {
      snapshotData = JSON.parse(fileContent);
    } catch (jsonError) {
      console.error(`   ❌ Error parsing snapshot file: ${yamlError}`);
      return [];
    }
  }
  
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
        if (created % 10 === 0) {
          process.stdout.write(`  ✅ Created ${created} wines...\r`);
        }
      }
    } catch (error) {
      errors++;
      console.error(`\n  ❌ Error importing ${wine.name}:`, error);
    }
  }

  console.log('\n📈 Database Import Summary:');
  console.log(`   ✅ Created: ${created} wines`);
  console.log(`   ✏️  Updated: ${updated} wines`);
  console.log(`   ⏭️  Skipped: ${skipped} wines (already exist)`);
  console.log(`   ❌ Errors: ${errors}`);
}

async function main() {
  // DATABASE_URL must be set in environment (e.g., .env.local)
  // For PostgreSQL, connection string format: postgresql://user:password@host/database?sslmode=require

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/process-vivino-snapshots.ts <snapshot1.json> [snapshot2.json] ...');
    console.log('\nExample:');
    console.log('  npx tsx scripts/process-vivino-snapshots.ts snapshot1.json snapshot2.json snapshot3.json');
    process.exit(1);
  }

  const snapshotFiles = args;
  const outputPath = path.join(__dirname, '..', 'data', 'vivino-wines.json');

  console.log('🍷 Processing Vivino Snapshots\n');

  let allWines: ScrapedWine[] = [];
  const existingWines = loadExistingWines(outputPath);

  for (const snapshotFile of snapshotFiles) {
    const wines = extractWinesFromSnapshotFile(snapshotFile);
    allWines = mergeWines(allWines, wines);
  }

  // Merge with existing wines
  const finalWines = mergeWines(existingWines, allWines);
  saveWines(finalWines, outputPath);

  console.log(`\n✅ Total wines extracted: ${finalWines.length}`);

  // Seed to database
  await seedWinesToDatabase(finalWines);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✅ Done!');
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error('❌ Error:', error);
    process.exit(1);
  });






