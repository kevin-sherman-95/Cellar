/**
 * Wineries API Route
 * Handles listing and searching wineries
 * Copyright Anysphere Inc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Normalize a winery name for comparison purposes.
 * This helps detect duplicates like "Equality Vines" vs "Equality Wines"
 */
function normalizeWineryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+(winery|wines|wine|vineyard|vineyards|vines|estate|cellars|cellar)$/i, '')
    .replace(/\s+/g, ' ');
}

/**
 * Merge duplicate wineries based on similar names.
 * Keeps the winery with the most wines as the target.
 */
async function mergeDuplicateWineries() {
  try {
    const wineries = await prisma.winery.findMany({
      include: {
        _count: { select: { wines: true } },
      },
    });

    // Group by normalized name
    const groups = new Map<string, typeof wineries>();
    for (const winery of wineries) {
      const normalized = normalizeWineryName(winery.name);
      if (!groups.has(normalized)) {
        groups.set(normalized, []);
      }
      groups.get(normalized)!.push(winery);
    }

    let mergedCount = 0;
    for (const [_, group] of groups) {
      if (group.length <= 1) continue;

      // Sort by wine count descending, then by name length (prefer shorter/cleaner names)
      group.sort((a, b) => {
        if (b._count.wines !== a._count.wines) {
          return b._count.wines - a._count.wines;
        }
        return a.name.length - b.name.length;
      });

      const target = group[0];
      const duplicates = group.slice(1);

      console.log(`🔄 Merging duplicates into "${target.name}": ${duplicates.map(d => d.name).join(', ')}`);

      for (const dup of duplicates) {
        // Update wines to point to target winery and use target name
        await prisma.wine.updateMany({
          where: { wineryId: dup.id },
          data: { 
            wineryId: target.id,
            vineyard: target.name,
          },
        });

        // Also update any wines that have the duplicate vineyard name but no wineryId
        await prisma.wine.updateMany({
          where: { 
            vineyard: dup.name,
            wineryId: null,
          },
          data: { 
            wineryId: target.id,
            vineyard: target.name,
          },
        });

        // Delete the duplicate winery
        await prisma.winery.delete({
          where: { id: dup.id },
        });

        mergedCount++;
        console.log(`  🗑️ Merged and deleted: ${dup.name}`);
      }
    }

    if (mergedCount > 0) {
      console.log(`✅ Merged ${mergedCount} duplicate wineries`);
    }
    return { merged: mergedCount };
  } catch (error) {
    console.error('Error merging duplicate wineries:', error);
    return { merged: 0, error };
  }
}

/**
 * Sync wines to wineries - creates winery records for any wines
 * that don't have a corresponding winery yet.
 * This ensures wines added to cellars appear in Browse Wineries.
 */
async function syncWinesToWineries() {
  try {
    // Get all unique vineyard names from wines that don't have a wineryId
    const winesWithoutWinery = await prisma.wine.findMany({
      where: {
        wineryId: null,
        vineyard: { not: '' },
      },
      select: {
        vineyard: true,
        region: true,
        country: true,
      },
      distinct: ['vineyard'],
    });

    if (winesWithoutWinery.length === 0) {
      // Still check for duplicates even if no new wines to sync
      await mergeDuplicateWineries();
      return { synced: 0 };
    }

    console.log(`🔄 Syncing ${winesWithoutWinery.length} wineries from cellar wines...`);

    let synced = 0;
    for (const wine of winesWithoutWinery) {
      const normalizedName = normalizeWineryName(wine.vineyard);
      
      // Check if a winery with a similar name already exists
      const allWineries = await prisma.winery.findMany({
        select: { id: true, name: true },
      });
      
      const existingWinery = allWineries.find(
        w => normalizeWineryName(w.name) === normalizedName
      );

      let wineryId: string;
      let wineryName: string;
      
      if (existingWinery) {
        wineryId = existingWinery.id;
        wineryName = existingWinery.name;
      } else {
        // Create new winery
        const newWinery = await prisma.winery.create({
          data: {
            name: wine.vineyard,
            region: wine.region,
            country: wine.country,
          },
        });
        wineryId = newWinery.id;
        wineryName = wine.vineyard;
        console.log(`  ✨ Created winery: ${wine.vineyard}`);
        synced++;
      }

      // Update all wines with this vineyard to link to the winery
      // Also normalize the vineyard name to match the winery name
      await prisma.wine.updateMany({
        where: {
          vineyard: wine.vineyard,
          wineryId: null,
        },
        data: {
          wineryId: wineryId,
          vineyard: wineryName, // Normalize to existing winery name
        },
      });
    }

    // After syncing, merge any remaining duplicates
    await mergeDuplicateWineries();

    if (synced > 0) {
      console.log(`✅ Synced ${synced} new wineries from cellar wines`);
    }
    return { synced };
  } catch (error) {
    console.error('Error syncing wines to wineries:', error);
    return { synced: 0, error };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auto-sync wines to wineries on each request
    // This ensures wines added to cellars appear in Browse Wineries
    await syncWinesToWineries();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    console.log('🔍 Winery API called with query:', query, 'city:', city);

    // Build where clause for filtering (case-insensitive search)
    const where: any = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
        { region: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    // Get total count for pagination
    const total = await prisma.winery.count({ where });

    // Fetch wineries
    const wineries = await prisma.winery.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { wines: true },
        },
      },
    });

    console.log('✅ Found', wineries.length, 'wineries out of', total, 'total');

    return NextResponse.json({
      wineries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching wineries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wineries' },
      { status: 500 }
    );
  }
}




