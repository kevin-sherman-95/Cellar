/**
 * Script to sync wines from user cellars to the wineries database.
 * This creates Winery records for any wines that have a vineyard name
 * but no corresponding winery record.
 * 
 * Copyright Anysphere Inc.
 * 
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-cellar-wines-to-wineries.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncCellarWinesToWineries() {
  console.log('🍷 Starting sync of cellar wines to wineries database...\n');

  try {
    // Step 1: Get all wines that don't have a wineryId but have a vineyard name
    const winesWithoutWinery = await prisma.wine.findMany({
      where: {
        wineryId: null,
        vineyard: {
          not: '',
        },
      },
      select: {
        id: true,
        name: true,
        vineyard: true,
        region: true,
        country: true,
      },
    });

    console.log(`Found ${winesWithoutWinery.length} wines without a linked winery.\n`);

    if (winesWithoutWinery.length === 0) {
      console.log('✅ All wines are already linked to wineries. Nothing to do.');
      return;
    }

    // Step 2: Group wines by vineyard/winery name to avoid creating duplicates
    const wineryGroups = new Map<string, typeof winesWithoutWinery>();
    
    for (const wine of winesWithoutWinery) {
      const key = wine.vineyard;
      if (!wineryGroups.has(key)) {
        wineryGroups.set(key, []);
      }
      wineryGroups.get(key)!.push(wine);
    }

    console.log(`Found ${wineryGroups.size} unique wineries to process.\n`);

    // Step 3: Create or find wineries and link wines
    let wineriesCreated = 0;
    let wineriesFound = 0;
    let winesUpdated = 0;

    for (const [wineryName, wines] of wineryGroups) {
      // Use the first wine's region and country for the winery
      const firstWine = wines[0];
      
      // Try to find existing winery
      let winery = await prisma.winery.findFirst({
        where: {
          name: wineryName,
        },
      });

      if (winery) {
        console.log(`  📍 Found existing winery: ${wineryName}`);
        wineriesFound++;
      } else {
        // Create new winery
        winery = await prisma.winery.create({
          data: {
            name: wineryName,
            region: firstWine.region,
            country: firstWine.country,
          },
        });
        console.log(`  ✨ Created new winery: ${wineryName} (${firstWine.region}, ${firstWine.country})`);
        wineriesCreated++;
      }

      // Update all wines with this vineyard name to link to the winery
      const updateResult = await prisma.wine.updateMany({
        where: {
          vineyard: wineryName,
          wineryId: null,
        },
        data: {
          wineryId: winery.id,
        },
      });

      winesUpdated += updateResult.count;
      console.log(`    Linked ${updateResult.count} wine(s) to ${wineryName}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Sync Summary:');
    console.log(`   Wineries created: ${wineriesCreated}`);
    console.log(`   Existing wineries found: ${wineriesFound}`);
    console.log(`   Wines linked to wineries: ${winesUpdated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Sync completed successfully!');
    console.log('   All wines from user cellars are now available in Browse Wineries.');

  } catch (error) {
    console.error('❌ Error during sync:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncCellarWinesToWineries()
  .catch((error) => {
    console.error('Failed to sync:', error);
    process.exit(1);
  });


