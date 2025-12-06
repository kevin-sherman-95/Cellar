import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { addPineRidgeBlackDiamondToTried } from '@/lib/actions'

// Mark this route as dynamic to prevent static optimization during build
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const result = await addPineRidgeBlackDiamondToTried(session.user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to add Pine Ridge wine to tried collection:', error)
    return NextResponse.json(
      { error: 'Failed to add wine to collection' },
      { status: 500 }
    )
  }
}
