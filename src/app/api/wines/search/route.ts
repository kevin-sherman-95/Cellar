import { NextRequest, NextResponse } from 'next/server'
import { searchExternalWines as searchExternalWinesAction } from '@/lib/wine-actions'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

/**
 * API route for searching external wine sources
 * This allows the frontend to query external wine databases
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const varietal = searchParams.get('varietal') || undefined
    const region = searchParams.get('region') || undefined
    const country = searchParams.get('country') || undefined
    const vintage = searchParams.get('vintage') 
      ? parseInt(searchParams.get('vintage')!) 
      : undefined

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Rate limiting: simple check (in production, use a proper rate limiting library)
    // For now, we'll rely on Next.js built-in protections

    const externalWines = await searchExternalWinesAction({
      search: query,
      varietal,
      region,
      country,
      vintage,
    })

    return NextResponse.json({
      wines: externalWines,
      count: externalWines.length,
    })
  } catch (error) {
    console.error('Error in wine search API:', error)
    return NextResponse.json(
      { error: 'Failed to search wines' },
      { status: 500 }
    )
  }
}

