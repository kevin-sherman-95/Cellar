/**
 * Winery Seeder Script
 * Populates the database with wineries from various sources
 * Supports merge mode to avoid duplicates
 * Copyright Anysphere Inc.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Napa Valley data format (from move2napavalley.com)
interface NapaWineryData {
  name: string;
  address?: string;
  city?: string;
  region: string;
  phone?: string;
}

// WineRelease data format (hierarchical location)
interface WineReleaseData {
  name: string;
  country: string;
  state?: string;
  region?: string;
  county?: string;
  subregion?: string;
}

type WineryData = NapaWineryData | WineReleaseData;

function isNapaFormat(data: WineryData): data is NapaWineryData {
  return 'phone' in data || 'address' in data;
}

function isWineReleaseFormat(data: WineryData): data is WineReleaseData {
  return 'country' in data && 'state' in data;
}

async function seedWineries(filePath: string, datasetName: string) {
  console.log(`\n📖 Loading ${datasetName}...`);
  
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${fullPath}`);
    return { created: 0, skipped: 0, errors: 0 };
  }

  const wineriesData: WineryData[] = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  console.log(`📊 Found ${wineriesData.length} wineries in ${datasetName}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const wineryData of wineriesData) {
    try {
      // Check if winery already exists (by name)
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

      if (isNapaFormat(wineryData)) {
        // Napa Valley format - has address, city, phone
        createData = {
          ...createData,
          address: wineryData.address || null,
          city: wineryData.city || null,
          region: wineryData.region || 'Napa Valley',
          country: 'United States',
          phone: wineryData.phone || null,
        };
      } else if (isWineReleaseFormat(wineryData)) {
        // WineRelease format - has hierarchical location
        // Build region string from available data
        const regionParts = [
          wineryData.county,
          wineryData.subregion,
          wineryData.region,
        ].filter(Boolean);
        
        createData = {
          ...createData,
          city: wineryData.subregion || wineryData.county || wineryData.region || null,
          region: regionParts[0] || wineryData.state || 'Unknown',
          country: wineryData.country,
        };
      }

      // Create the winery
      await prisma.winery.create({ data: createData });
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${wineryData.name}:`, error);
      errors++;
    }
  }

  return { created, skipped, errors, total: wineriesData.length };
}

async function main() {
  console.log('🍷 Starting winery seeder...\n');

  const datasetFile = process.argv[2] || 'data/napa-wineries-complete.json';
  const datasetName = path.basename(datasetFile, '.json');

  const results = await seedWineries(datasetFile, datasetName);

  console.log('\n🎉 Seeding complete!');
  console.log(`   ✅ Created: ${results.created}`);
  console.log(`   ⏭️  Skipped (duplicates): ${results.skipped}`);
  console.log(`   ❌ Errors: ${results.errors}`);
  console.log(`   📊 Total processed: ${results.total}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






