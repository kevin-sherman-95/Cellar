/**
 * Combined Winery Seeder Script
 * Seeds both Napa Valley and WineRelease datasets
 * Automatically handles deduplication
 * Copyright Anysphere Inc.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Napa Valley data format
interface NapaWineryData {
  name: string;
  address?: string;
  city?: string;
  region: string;
  phone?: string;
}

// WineRelease data format
interface WineReleaseData {
  name: string;
  country: string;
  state?: string;
  region?: string;
  county?: string;
  subregion?: string;
}

// Livermore Valley data format
interface LivermoreWineryData {
  name: string;
  address?: string;
  city?: string;
  region: string;
  country: string;
  phone?: string | null;
  website?: string;
  description?: string;
}

type WineryData = NapaWineryData | WineReleaseData | LivermoreWineryData;

function isLivermoreFormat(data: WineryData): data is LivermoreWineryData {
  return 'description' in data || ('country' in data && 'region' in data && !('state' in data));
}

function isNapaFormat(data: WineryData): data is NapaWineryData {
  return ('phone' in data || 'address' in data) && !('country' in data);
}

function isWineReleaseFormat(data: WineryData): data is WineReleaseData {
  return 'country' in data && 'state' in data;
}

async function seedDataset(filePath: string, datasetName: string) {
  console.log(`\n📖 Loading ${datasetName}...`);
  
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${fullPath}`);
    return { created: 0, skipped: 0, errors: 0, total: 0 };
  }

  const wineriesData: WineryData[] = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  console.log(`📊 Found ${wineriesData.length} wineries\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const wineryData of wineriesData) {
    try {
      // Check if winery already exists
      const existing = await prisma.winery.findUnique({
        where: { name: wineryData.name },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Prepare data based on format
      let createData: any = {
        name: wineryData.name,
      };

      if (isLivermoreFormat(wineryData)) {
        // Livermore Valley format - includes website and description
        createData = {
          ...createData,
          address: wineryData.address || null,
          city: wineryData.city || null,
          region: wineryData.region || 'Livermore Valley',
          country: wineryData.country || 'United States',
          phone: wineryData.phone || null,
          website: wineryData.website || null,
          description: wineryData.description || null,
        };
      } else if (isNapaFormat(wineryData)) {
        // Napa Valley format
        createData = {
          ...createData,
          address: wineryData.address || null,
          city: wineryData.city || null,
          region: wineryData.region || 'Napa Valley',
          country: 'United States',
          phone: wineryData.phone || null,
        };
      } else if (isWineReleaseFormat(wineryData)) {
        // WineRelease format - use subregion/county as city, and most specific region
        const regionParts = [
          wineryData.subregion,
          wineryData.county,
          wineryData.region,
        ].filter(Boolean);
        
        createData = {
          ...createData,
          city: wineryData.subregion || wineryData.county || null,
          region: regionParts[0] || wineryData.state || 'Unknown',
          country: wineryData.country,
        };
      }

      // Create the winery
      await prisma.winery.create({ data: createData });
      console.log(`✅ Created: ${wineryData.name}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${wineryData.name}:`, error);
      errors++;
    }
  }

  return { created, skipped, errors, total: wineriesData.length };
}

async function main() {
  console.log('🍷 Starting combined winery seeder...\n');
  console.log('This will seed wineries from multiple sources with automatic deduplication.\n');

  // Dataset configurations
  const datasets = [
    { file: 'data/napa-wineries-complete.json', name: 'Napa Valley Wineries' },
    { file: 'data/winerelease-wineries.json', name: 'WineRelease North American Wineries' },
    { file: 'data/livermore-wineries.json', name: 'Livermore Valley Wineries' },
  ];

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalProcessed = 0;

  // Seed each dataset
  for (const dataset of datasets) {
    const results = await seedDataset(dataset.file, dataset.name);
    totalCreated += results.created;
    totalSkipped += results.skipped;
    totalErrors += results.errors;
    totalProcessed += results.total;
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL DATASETS SEEDED!');
  console.log('='.repeat(60));
  console.log(`   ✅ Total Created: ${totalCreated}`);
  console.log(`   ⏭️  Total Skipped (duplicates): ${totalSkipped}`);
  console.log(`   ❌ Total Errors: ${totalErrors}`);
  console.log(`   📊 Total Processed: ${totalProcessed}`);
  console.log(`   🗄️  Wineries in Database: ${totalCreated + (totalProcessed > 0 ? await prisma.winery.count() - totalCreated : 0)}`);
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
