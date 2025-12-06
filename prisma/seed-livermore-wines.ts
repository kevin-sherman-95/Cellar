/**
 * Livermore Valley Wines Seeder Script
 * Seeds wines from Livermore Valley wineries
 * Copyright Anysphere Inc.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface WineData {
  name: string;
  vineyard: string;
  region: string;
  country: string;
  varietal: string;
  vintage?: number;
  description?: string;
  alcoholContent?: number;
}

async function main() {
  console.log('🍷 Starting Livermore Valley wines seeder...\n');

  const filePath = path.join(__dirname, '..', 'data/livermore-wines.json');
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const winesData: WineData[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`📊 Found ${winesData.length} wines\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const wineData of winesData) {
    try {
      // Check if wine already exists
      const existing = await prisma.wine.findFirst({
        where: {
          name: wineData.name,
          vineyard: wineData.vineyard,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Find matching winery
      const winery = await prisma.winery.findFirst({
        where: {
          name: {
            contains: wineData.vineyard.split(' ')[0], // Match on first word
          },
        },
      });

      // Create the wine
      await prisma.wine.create({
        data: {
          name: wineData.name,
          vineyard: wineData.vineyard,
          wineryId: winery?.id || null,
          region: wineData.region,
          country: wineData.country,
          varietal: wineData.varietal,
          vintage: wineData.vintage || null,
          description: wineData.description || null,
          alcoholContent: wineData.alcoholContent || null,
        },
      });
      console.log(`✅ Created: ${wineData.name}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${wineData.name}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 LIVERMORE WINES SEEDED!');
  console.log('='.repeat(60));
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total Processed: ${winesData.length}`);
  const totalWines = await prisma.wine.count();
  console.log(`   🍷 Total Wines in Database: ${totalWines}`);
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






