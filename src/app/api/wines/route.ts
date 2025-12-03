/**
 * Wines API Route
 * Handles listing and searching wines
 * Copyright Anysphere Inc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const varietal = searchParams.get('varietal') || ''
    const region = searchParams.get('region') || ''
    const country = searchParams.get('country') || ''
    const vintageStr = searchParams.get('vintage')
    const vintage = vintageStr ? parseInt(vintageStr) : null
    const limit = parseInt(searchParams.get('limit') || '100')

    console.log('🔍 Wines API called with search:', search)

    // Build where clause
    const where: any = {}

    if (search && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search } },
        { vineyard: { contains: search } },
        { region: { contains: search } },
        { varietal: { contains: search } },
      ]
    }

    if (varietal) {
      where.varietal = { contains: varietal }
    }

    if (region) {
      where.region = { contains: region }
    }

    if (country) {
      where.country = { contains: country }
    }

    if (vintage) {
      where.vintage = vintage
    }

    // Fetch wines from database
    const wines = await prisma.wine.findMany({
      where,
      include: {
        _count: {
          select: { reviews: true, userWines: true }
        },
        reviews: {
          select: { rating: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Calculate average ratings
    const winesWithRatings = wines.map(wine => ({
      ...wine,
      averageRating: wine.reviews.length > 0 
        ? wine.reviews.reduce((acc, review) => acc + review.rating, 0) / wine.reviews.length
        : 0,
      source: 'local' as const
    }))

    console.log('✅ Found', winesWithRatings.length, 'wines')

    return NextResponse.json({
      wines: winesWithRatings,
      total: winesWithRatings.length
    })
  } catch (error) {
    console.error('Error fetching wines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wines', wines: [] },
      { status: 500 }
    )
  }
}


