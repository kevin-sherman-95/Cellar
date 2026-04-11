import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, vineyard, region, country, varietal, vintage } = body

    const data: Record<string, unknown> = {}
    if (typeof name === 'string' && name.trim()) data.name = name.trim()
    if (typeof vineyard === 'string' && vineyard.trim()) data.vineyard = vineyard.trim()
    if (typeof region === 'string' && region.trim()) data.region = region.trim()
    if (typeof country === 'string' && country.trim()) data.country = country.trim()
    if (typeof varietal === 'string' && varietal.trim()) data.varietal = varietal.trim()
    if (vintage !== undefined) {
      data.vintage = vintage === null || vintage === '' ? null : Number(vintage)
      if (data.vintage !== null && isNaN(data.vintage as number)) {
        return NextResponse.json(
          { error: 'Vintage must be a valid number' },
          { status: 400 }
        )
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided' },
        { status: 400 }
      )
    }

    const existing = await prisma.wine.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Wine not found' }, { status: 404 })
    }

    const updated = await prisma.wine.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ success: true, wine: updated })
  } catch (error) {
    console.error('Failed to update wine:', error)
    return NextResponse.json(
      { error: 'Failed to update wine' },
      { status: 500 }
    )
  }
}
