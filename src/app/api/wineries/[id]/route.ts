/**
 * Individual Winery API Route
 * Handles fetching a specific winery by ID or name
 * Falls back to showing wines by vineyard name if no winery record exists
 * Copyright Anysphere Inc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idOrName = decodeURIComponent(params.id);
    
    // Try to find by ID first, then by name
    let winery = await prisma.winery.findUnique({
      where: { id: idOrName },
      include: {
        wines: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { reviews: true },
            },
          },
        },
        _count: {
          select: { wines: true },
        },
      },
    });

    // If not found by ID, try by name
    if (!winery) {
      winery = await prisma.winery.findUnique({
        where: { name: idOrName },
        include: {
          wines: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              _count: {
                select: { reviews: true },
              },
            },
          },
          _count: {
            select: { wines: true },
          },
        },
      });
    }

    // If still not found, look for wines with this vineyard name and create a virtual winery response
    if (!winery) {
      const wines = await prisma.wine.findMany({
        where: { vineyard: idOrName },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { reviews: true },
          },
        },
      });

      if (wines.length > 0) {
        // Get total count of wines with this vineyard
        const totalWines = await prisma.wine.count({
          where: { vineyard: idOrName },
        });

        // Create a virtual winery response from the wine data
        const firstWine = wines[0];
        return NextResponse.json({
          id: `vineyard-${idOrName}`,
          name: idOrName,
          address: null,
          city: null,
          region: firstWine.region,
          country: firstWine.country,
          phone: null,
          website: null,
          description: null,
          image: null,
          wines: wines,
          _count: {
            wines: totalWines,
          },
          isVirtual: true, // Flag to indicate this is not a real winery record
        });
      }

      return NextResponse.json(
        { error: 'Winery not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(winery);
  } catch (error) {
    console.error('Error fetching winery:', error);
    return NextResponse.json(
      { error: 'Failed to fetch winery' },
      { status: 500 }
    );
  }
}


