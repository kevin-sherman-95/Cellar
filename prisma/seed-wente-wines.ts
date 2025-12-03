/**
 * Wente Vineyards Wines Seeder Script
 * Seeds all wines from Wente Vineyards (wentevineyards.com)
 * Copyright Anysphere Inc.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface WenteWineData {
  name: string;
  vineyard: string;
  region: string;
  country: string;
  varietal: string;
  vintage: number | null;
  description?: string;
  collection?: string;
}

async function main() {
  console.log('🍷 Starting Wente Vineyards wines seeder...\n');
  console.log('   Source: https://wentevineyards.com/collection/all-wine/\n');

  const filePath = path.join(__dirname, '..', 'data/wente-wines.json');
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const winesData: WenteWineData[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`📊 Found ${winesData.length} Wente wines to process\n`);

  // First, ensure Wente Vineyards exists as a winery
  let winery = await prisma.winery.findFirst({
    where: {
      name: {
        contains: 'Wente',
      },
    },
  });

  if (!winery) {
    console.log('📍 Creating Wente Vineyards winery entry...');
    winery = await prisma.winery.create({
      data: {
        name: 'Wente Vineyards',
        address: '5050 Arroyo Road',
        city: 'Livermore',
        region: 'Livermore Valley',
        country: 'United States',
        phone: '925.456.2300',
        website: 'https://wentevineyards.com',
        description: 'Family owned and certified sustainable, Wente Vineyards has been producing award-winning wines in Livermore Valley for over 140 years. The Wente family is committed to making the highest quality wines and experiences. Fifth generation winemakers continue the legacy of California wine pioneers.',
      },
    });
    console.log('✅ Created Wente Vineyards winery\n');
  } else {
    console.log(`✅ Found existing winery: ${winery.name}\n`);
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const wineData of winesData) {
    try {
      // Check if wine already exists (by name and vineyard)
      const existing = await prisma.wine.findFirst({
        where: {
          name: wineData.name,
          vineyard: wineData.vineyard,
        },
      });

      if (existing) {
        console.log(`⏭️  Skipped (exists): ${wineData.name}`);
        skipped++;
        continue;
      }

      // Create the wine
      await prisma.wine.create({
        data: {
          name: wineData.name,
          vineyard: wineData.vineyard,
          wineryId: winery.id,
          region: wineData.region,
          country: wineData.country,
          varietal: wineData.varietal,
          vintage: wineData.vintage,
          description: wineData.description || null,
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
  console.log('🍷 WENTE VINEYARDS WINES SEEDED!');
  console.log('='.repeat(60));
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total Processed: ${winesData.length}`);
  
  const totalWines = await prisma.wine.count();
  const wenteWines = await prisma.wine.count({
    where: {
      vineyard: 'Wente Vineyards',
    },
  });
  
  console.log(`   🍷 Total Wente Wines in Database: ${wenteWines}`);
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




