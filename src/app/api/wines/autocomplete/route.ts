import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

/**
 * Fast autocomplete API for wine search
 * Searches local database only for quick typeahead results
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    if (!query || query.length < 2) {
      return NextResponse.json({ wines: [] })
    }

    // Search local database with optimized query
    const wines = await prisma.wine.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { vineyard: { contains: query } },
          { varietal: { contains: query } },
          { region: { contains: query } },
        ]
      },
      select: {
        id: true,
        name: true,
        vineyard: true,
        vintage: true,
        varietal: true,
        region: true,
      },
      take: 8,
      orderBy: [
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ wines })
  } catch (error) {
    console.error('Error in wine autocomplete API:', error)
    return NextResponse.json(
      { error: 'Failed to search wines', wines: [] },
      { status: 500 }
    )
  }
}




