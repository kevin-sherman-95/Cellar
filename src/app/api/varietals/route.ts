import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const wines = await prisma.wine.findMany({
      select: {
        varietal: true
      }
    })
    
    // Get unique varietals
    const varietals = Array.from(new Set(wines.map(w => w.varietal).filter(Boolean))).sort()
    
    return NextResponse.json(varietals)
  } catch (error) {
    console.error('Failed to fetch varietals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch varietals' },
      { status: 500 }
    )
  }
}




