/**
 * API endpoint to sync wines with wineries.
 * This ensures all wines in the database have corresponding winery records.
 * 
 * Copyright Anysphere Inc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { findOrCreateWinery } from '@/lib/wine-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Optional: Require authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get all wines that don't have a wineryId but have a vineyard name
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

    if (winesWithoutWinery.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All wines are already linked to wineries',
        wineriesCreated: 0,
        winesUpdated: 0,
      });
    }

    // Group wines by vineyard/winery name
    const wineryGroups = new Map<string, typeof winesWithoutWinery>();
    
    for (const wine of winesWithoutWinery) {
      const key = wine.vineyard;
      if (!wineryGroups.has(key)) {
        wineryGroups.set(key, []);
      }
      wineryGroups.get(key)!.push(wine);
    }

    // Create or find wineries and link wines
    let wineriesCreated = 0;
    let winesUpdated = 0;

    for (const [wineryName, wines] of wineryGroups) {
      const firstWine = wines[0];
      
      // Check if winery already exists
      const existingWinery = await prisma.winery.findFirst({
        where: { name: wineryName },
      });

      let winery;
      if (existingWinery) {
        winery = existingWinery;
      } else {
        winery = await findOrCreateWinery(wineryName, firstWine.region, firstWine.country);
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
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${winesUpdated} wines to ${wineryGroups.size} wineries`,
      wineriesCreated,
      winesUpdated,
      totalWineries: wineryGroups.size,
    });

  } catch (error) {
    console.error('Error syncing wineries:', error);
    return NextResponse.json(
      { error: 'Failed to sync wineries', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  try {
    const winesWithoutWinery = await prisma.wine.count({
      where: {
        wineryId: null,
        vineyard: {
          not: '',
        },
      },
    });

    const totalWines = await prisma.wine.count();
    const totalWineries = await prisma.winery.count();

    return NextResponse.json({
      winesWithoutWinery,
      totalWines,
      totalWineries,
      syncNeeded: winesWithoutWinery > 0,
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    );
  }
}


