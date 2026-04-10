/**
 * API endpoint to merge duplicate wineries.
 * This fixes cases where wines were entered with slightly different winery names.
 * 
 * Copyright Anysphere Inc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST: Merge duplicate wineries into one
 * Body: { sourceNames: string[], targetName: string }
 * - sourceNames: Array of winery/vineyard names to merge FROM
 * - targetName: The winery name to merge INTO (will be created if doesn't exist)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sourceNames, targetName } = body;

    if (!sourceNames || !Array.isArray(sourceNames) || sourceNames.length === 0) {
      return NextResponse.json(
        { error: 'sourceNames array is required' },
        { status: 400 }
      );
    }

    if (!targetName || typeof targetName !== 'string') {
      return NextResponse.json(
        { error: 'targetName string is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Merging wineries: ${sourceNames.join(', ')} → ${targetName}`);

    // Step 1: Find or create the target winery
    let targetWinery = await prisma.winery.findFirst({
      where: { name: targetName },
    });

    if (!targetWinery) {
      // Get region/country from one of the source wines
      const sampleWine = await prisma.wine.findFirst({
        where: {
          vineyard: { in: [...sourceNames, targetName] },
        },
        select: { region: true, country: true },
      });

      targetWinery = await prisma.winery.create({
        data: {
          name: targetName,
          region: sampleWine?.region || 'Unknown',
          country: sampleWine?.country || 'United States',
        },
      });
      console.log(`  ✨ Created target winery: ${targetName}`);
    }

    // Step 2: Update all wines with source vineyard names to use target name and winery
    const allSourceNames = [...new Set([...sourceNames])]; // Remove duplicates
    
    let winesUpdated = 0;
    for (const sourceName of allSourceNames) {
      if (sourceName === targetName) continue; // Skip if same as target

      const updateResult = await prisma.wine.updateMany({
        where: { vineyard: sourceName },
        data: {
          vineyard: targetName,
          wineryId: targetWinery.id,
        },
      });
      winesUpdated += updateResult.count;
      
      if (updateResult.count > 0) {
        console.log(`  📝 Updated ${updateResult.count} wines from "${sourceName}" to "${targetName}"`);
      }
    }

    // Also update wines that already have the target name but no wineryId
    const targetUpdate = await prisma.wine.updateMany({
      where: {
        vineyard: targetName,
        wineryId: null,
      },
      data: {
        wineryId: targetWinery.id,
      },
    });
    if (targetUpdate.count > 0) {
      winesUpdated += targetUpdate.count;
      console.log(`  📝 Linked ${targetUpdate.count} existing "${targetName}" wines to winery`);
    }

    // Step 3: Delete the source wineries (they're now unused)
    let wineriesDeleted = 0;
    for (const sourceName of allSourceNames) {
      if (sourceName === targetName) continue;

      const deleteResult = await prisma.winery.deleteMany({
        where: { name: sourceName },
      });
      wineriesDeleted += deleteResult.count;
      
      if (deleteResult.count > 0) {
        console.log(`  🗑️ Deleted winery: ${sourceName}`);
      }
    }

    console.log(`✅ Merge complete: ${winesUpdated} wines updated, ${wineriesDeleted} duplicate wineries removed`);

    return NextResponse.json({
      success: true,
      message: `Merged ${sourceNames.length} winery names into "${targetName}"`,
      winesUpdated,
      wineriesDeleted,
      targetWineryId: targetWinery.id,
    });

  } catch (error) {
    console.error('Error merging wineries:', error);
    return NextResponse.json(
      { error: 'Failed to merge wineries', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET: Find potential duplicate wineries based on similar names
 */
export async function GET() {
  try {
    const wineries = await prisma.winery.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { wines: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Group wineries by normalized name (lowercase, trimmed)
    const groups = new Map<string, typeof wineries>();
    
    for (const winery of wineries) {
      // Normalize: lowercase, remove extra spaces, remove common suffixes
      const normalized = winery.name
        .toLowerCase()
        .trim()
        .replace(/\s+(winery|wines|vineyard|vineyards|estate|cellars)$/i, '')
        .replace(/\s+/g, ' ');
      
      if (!groups.has(normalized)) {
        groups.set(normalized, []);
      }
      groups.get(normalized)!.push(winery);
    }

    // Find groups with potential duplicates (more than 1 winery with similar name)
    const potentialDuplicates = Array.from(groups.entries())
      .filter(([_, wineries]) => wineries.length > 1)
      .map(([normalizedName, wineries]) => ({
        normalizedName,
        wineries: wineries.map(w => ({
          id: w.id,
          name: w.name,
          wineCount: w._count.wines,
        })),
      }));

    return NextResponse.json({
      potentialDuplicates,
      totalWineries: wineries.length,
    });

  } catch (error) {
    console.error('Error finding duplicate wineries:', error);
    return NextResponse.json(
      { error: 'Failed to find duplicates' },
      { status: 500 }
    );
  }
}


