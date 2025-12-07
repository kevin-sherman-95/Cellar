import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getUserWinesWithReviews, addWineToCollection, addWineToCellar, addWineToTried, removeWineFromCellar, removeWineFromCollection, removeUserWineEntry, findOrCreateWine, updateCellarQuantity, updateUserWineNotes } from '@/lib/actions'
import { WineFormData } from '@/lib/types'

export const dynamic = 'force-dynamic'

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

    // Validate required wine fields
    if (!wineData.name || !wineData.vineyard || !wineData.region || !wineData.country || !wineData.varietal) {
      return NextResponse.json(
        { error: 'Missing required wine fields: name, vineyard, region, country, and varietal are required' },
        { status: 400 }
      )
    }

    // Find or create the wine
    console.log('Finding or creating wine:', wineData)
    let wine
    try {
      wine = await findOrCreateWine(wineData as WineFormData)
      console.log('Wine found/created:', { id: wine.id, name: wine.name })
    } catch (wineError) {
      console.error('Error finding/creating wine:', wineError)
      const wineErrorMessage = wineError instanceof Error ? wineError.message : 'Failed to find or create wine'
      return NextResponse.json(
        { error: 'Failed to find or create wine', details: wineErrorMessage },
        { status: 500 }
      )
    }

    // Add wine to user's collection or cellar
    let cellarResult = null
    if (addToCellar) {
      // Add to cellar with quantity of 1 (will increment if already in cellar)
      console.log('Adding wine to cellar:', { userId: session.user.id, wineId: wine.id })
      try {
        cellarResult = await addWineToCellar(session.user.id, wine.id, 1)
        console.log('Successfully added wine to cellar:', { 
          userWineId: cellarResult.id, 
          inCellar: cellarResult.inCellar, 
          quantity: cellarResult.quantity,
          status: cellarResult.status 
        })
      } catch (cellarError) {
        console.error('Error adding wine to cellar:', cellarError)
        const cellarErrorMessage = cellarError instanceof Error ? cellarError.message : 'Failed to add wine to cellar'
        throw new Error(`Failed to add wine to cellar: ${cellarErrorMessage}`)
      }
    } else if (status === 'TRIED') {
      // For TRIED status, always create a new entry to allow multiple entries
      console.log('Adding wine to TRIED collection:', { userId: session.user.id, wineId: wine.id, wineName: wine.name })
      try {
        const triedResult = await addWineToTried(session.user.id, wine.id)
        console.log('Successfully added wine to TRIED collection:', triedResult)
        // Return success with details about what was added
        return NextResponse.json({ 
          success: true, 
          wineId: wine.id,
          addedToCellar: addToCellar || false,
          status: status,
          triedEntry: triedResult
        })
      } catch (triedError) {
        console.error('Error in addWineToTried:', triedError)
        throw triedError
      }
    } else {
      // For other statuses, use upsert to update existing entry
      await addWineToCollection(session.user.id, wine.id, status)
    }

    // Return success with details about what was added
    return NextResponse.json({ 
      success: true, 
      wineId: wine.id,
      addedToCellar: addToCellar || false,
      status: addToCellar ? 'WANT_TO_TRY' : status,
      quantity: cellarResult?.quantity,
      inCellar: cellarResult?.inCellar
    })
  } catch (error) {
    console.error('Failed to add wine to collection:', error)
    
    // Extract detailed error information
    let errorMessage = 'Unknown error'
    let errorCode = undefined
    
    if (error instanceof Error) {
      errorMessage = error.message
      // Check if it's a Prisma error
      if ('code' in error) {
        errorCode = (error as any).code
        console.error('Prisma error code:', errorCode)
      }
      console.error('Error stack:', error.stack)
    }
    
    // Provide more specific error messages based on error type
    if (errorCode === 'P2002') {
      errorMessage = 'This wine is already in your collection'
    } else if (errorCode === 'P2025') {
      errorMessage = 'Record not found'
    } else if (errorMessage.includes('Unique constraint')) {
      errorMessage = 'This wine is already in your collection'
    } else if (errorMessage.includes('Foreign key constraint')) {
      errorMessage = 'Invalid wine or user reference'
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to add wine to collection', 
        details: errorMessage,
        code: errorCode
      },
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
      if (!result) {
        return NextResponse.json(
          { error: 'Wine entry not found' },
          { status: 404 }
        )
      }
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
    const { wineId, userWineId } = body

    console.log('DELETE request received:', { wineId, userWineId, userId: session.user.id })

    // If userWineId is provided, delete that specific entry (useful for TRIED section)
    if (userWineId) {
      console.log('Deleting userWine entry:', userWineId)
      const result = await removeUserWineEntry(session.user.id, userWineId)
      console.log('Successfully deleted userWine entry:', result)
      return NextResponse.json({ success: true, deleted: true })
    }

    // Otherwise, use wineId to delete all entries for that wine (backward compatibility)
    if (!wineId) {
      return NextResponse.json(
        { error: 'Either wineId or userWineId is required' },
        { status: 400 }
      )
    }

    // Remove wine from user's collection entirely
    console.log('Deleting all entries for wineId:', wineId)
    await removeWineFromCollection(session.user.id, wineId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove wine from collection:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to remove wine from collection', details: errorMessage },
      { status: 500 }
    )
  }
}
