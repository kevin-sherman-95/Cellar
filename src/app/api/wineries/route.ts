/**
 * Wineries API Route
 * Handles listing and searching wineries
 * Copyright Anysphere Inc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    console.log('🔍 Winery API called with query:', query, 'city:', city);

    // Build where clause for filtering
    // Note: SQLite doesn't support mode: 'insensitive', so we use contains which is case-insensitive by default
    const where: any = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { city: { contains: query } },
        { address: { contains: query } },
        { region: { contains: query } },
      ];
    }

    if (city) {
      where.city = { equals: city };
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




