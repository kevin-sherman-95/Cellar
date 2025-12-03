/**
 * Winery Cities API Route
 * Returns unique list of cities with wineries
 * Copyright Anysphere Inc.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const wineries = await prisma.winery.findMany({
      select: { city: true },
      distinct: ['city'],
      where: {
        city: { not: null },
      },
      orderBy: { city: 'asc' },
    });

    const cities = wineries
      .map((w) => w.city)
      .filter((city): city is string => city !== null);

    return NextResponse.json({ cities });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}




