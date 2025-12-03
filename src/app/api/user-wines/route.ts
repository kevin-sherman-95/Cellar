import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getUserWinesWithReviews, addWineToCollection, addWineToCellar, removeWineFromCellar, removeWineFromCollection, findOrCreateWine, updateCellarQuantity, updateUserWineNotes } from '@/lib/actions'
import { WineFormData } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const userWines = await getUserWinesWithReviews(session.user.id, status)
    
    return NextResponse.json(userWines)
  } catch (error) {
    console.error('Failed to fetch user wines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user wines', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { wineData, status, addToCellar } = body

    if (!wineData || !status) {
      return NextResponse.json(
        { error: 'Wine data and status are required' },
        { status: 400 }
      )
    }

    // Find or create the wine
    const wine = await findOrCreateWine(wineData as WineFormData)

    // Add wine to user's collection or cellar
    if (addToCellar) {
      // Add to cellar with quantity of 1
      await addWineToCellar(session.user.id, wine.id, 1)
    } else {
      // Just add to collection with status
      await addWineToCollection(session.user.id, wine.id, status)
    }

    return NextResponse.json({ success: true, wineId: wine.id })
  } catch (error) {
    console.error('Failed to add wine to collection:', error)
    return NextResponse.json(
      { error: 'Failed to add wine to collection' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { wineId, inCellar, quantity, notes } = body

    if (!wineId) {
      return NextResponse.json(
        { error: 'Wine ID is required' },
        { status: 400 }
      )
    }

    // Handle notes updates
    if (notes !== undefined) {
      const result = await updateUserWineNotes(session.user.id, wineId, notes)
      return NextResponse.json({ success: true, notes: result.notes })
    }

    // Handle quantity updates
    if (typeof quantity === 'number') {
      const result = await updateCellarQuantity(session.user.id, wineId, quantity)
      return NextResponse.json({ success: true, quantity: result.quantity })
    }

    // If inCellar is false, remove from cellar but keep in collection as TRIED
    if (inCellar === false) {
      await removeWineFromCellar(session.user.id, wineId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update wine in collection:', error)
    return NextResponse.json(
      { error: 'Failed to update wine in collection' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { wineId } = body

    if (!wineId) {
      return NextResponse.json(
        { error: 'Wine ID is required' },
        { status: 400 }
      )
    }

    // Remove wine from user's collection entirely
    await removeWineFromCollection(session.user.id, wineId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove wine from collection:', error)
    return NextResponse.json(
      { error: 'Failed to remove wine from collection' },
      { status: 500 }
    )
  }
}
