import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resolveAndCacheWineImage } from '@/lib/wine-image-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  return backfillImages()
}

export async function POST() {
  return backfillImages()
}

async function backfillImages() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const userWines = await prisma.userWine.findMany({
    where: { userId: session.user.id },
    include: { wine: true },
  })

  const needsImage = userWines
    .map(uw => uw.wine)
    .filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i)
    .filter(w => !w.image || w.image.includes('fallback_1.png'))

  if (needsImage.length === 0) {
    return NextResponse.json({ message: 'All wines already have images', updated: 0 })
  }

  let updated = 0
  const results: { name: string; vineyard: string; status: string }[] = []

  for (const wine of needsImage) {
    try {
      const before = wine.image
      await resolveAndCacheWineImage({
        id: wine.id,
        name: wine.name,
        vineyard: wine.vineyard,
        varietal: wine.varietal,
        vintage: wine.vintage,
        image: wine.image,
        region: wine.region,
        country: wine.country,
      })

      const after = await prisma.wine.findUnique({
        where: { id: wine.id },
        select: { image: true },
      })

      if (after?.image && after.image !== before) {
        updated++
        results.push({ name: wine.name, vineyard: wine.vineyard, status: 'updated' })
      } else {
        results.push({ name: wine.name, vineyard: wine.vineyard, status: 'no match found' })
      }
    } catch (err) {
      results.push({
        name: wine.name,
        vineyard: wine.vineyard,
        status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
      })
    }
  }

  return NextResponse.json({
    message: `Processed ${needsImage.length} wines, updated ${updated} images`,
    updated,
    total: needsImage.length,
    results,
  })
}
