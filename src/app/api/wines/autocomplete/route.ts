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
    const query = (searchParams.get('q') || '').trim()
    const field = searchParams.get('field')

    console.log('🔍 Autocomplete search for:', query)

    if (!query) {
      return NextResponse.json({ wines: [] })
    }

    // Search local database with optimized query (case-insensitive)
    const wines = await prisma.wine.findMany({
      where: {
        ...(field === 'name'
          ? { name: { contains: query, mode: 'insensitive' as const } }
          : field === 'winery'
            ? { vineyard: { contains: query, mode: 'insensitive' as const } }
            : {
                OR: [
                  { name: { contains: query, mode: 'insensitive' as const } },
                  { vineyard: { contains: query, mode: 'insensitive' as const } },
                  { varietal: { contains: query, mode: 'insensitive' as const } },
                  { region: { contains: query, mode: 'insensitive' as const } },
                ]
              })
      },
      select: {
        id: true,
        name: true,
        vineyard: true,
        vintage: true,
        varietal: true,
        region: true,
        country: true,
      },
      take: 30,
      orderBy: field === 'winery'
        ? [{ vineyard: 'asc' }, { name: 'asc' }]
        : [{ name: 'asc' }]
    })

    // Prefer prefix matches so a short query such as "J" surfaces "J. Lohr"
    // before values that only contain the query later in their name.
    const normalizedQuery = query.toLocaleLowerCase()
    const rankedWines = wines
      .sort((a, b) => {
        const aValue = (field === 'winery' ? a.vineyard : a.name).toLocaleLowerCase()
        const bValue = (field === 'winery' ? b.vineyard : b.name).toLocaleLowerCase()
        const aStartsWith = aValue.startsWith(normalizedQuery)
        const bStartsWith = bValue.startsWith(normalizedQuery)

        if (aStartsWith !== bStartsWith) return aStartsWith ? -1 : 1
        return aValue.localeCompare(bValue)
      })
      .slice(0, 8)

    console.log('✅ Autocomplete found', rankedWines.length, 'wines:', rankedWines.map(w => w.name).join(', '))
    return NextResponse.json({ wines: rankedWines })
  } catch (error) {
    console.error('Error in wine autocomplete API:', error)
    return NextResponse.json(
      { error: 'Failed to search wines', wines: [] },
      { status: 500 }
    )
  }
}






