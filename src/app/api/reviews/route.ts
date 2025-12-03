import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createReview } from '@/lib/actions'
import { ReviewFormData } from '@/lib/types'

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
    const { wineId, rating, notes, photos } = body

    if (!wineId || rating === undefined || rating === null || rating < 0.5 || rating > 5) {
      return NextResponse.json(
        { error: 'Valid wineId and rating (0.5-5.0) are required' },
        { status: 400 }
      )
    }

    // Ensure rating is a valid half-star increment
    const validRatings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
    const roundedRating = Math.round(rating * 2) / 2
    if (!validRatings.includes(roundedRating)) {
      return NextResponse.json(
        { error: 'Rating must be in 0.5 star increments (0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)' },
        { status: 400 }
      )
    }

    const reviewData: ReviewFormData = {
      rating: roundedRating,
      notes: notes?.trim() || undefined,
      photos: photos || []
    }

    const review = await createReview(session.user.id, wineId, reviewData)

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error('Failed to create review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
