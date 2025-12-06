import { NextRequest, NextResponse } from 'next/server'
import { getWineBottleImage } from '@/lib/wine-image-server'
import { findWineImageMapping } from '@/lib/wine-image-mapping'
import { getVivinoWineImage } from '@/lib/vivino-image-fetcher'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * API route to fetch wine bottle image from Unsplash
 * GET /api/wines/[id]/image
 * 
 * This endpoint:
 * 1. Checks if wine already has an image in database
 * 2. If not, fetches from Unsplash API (if configured)
 * 3. Optionally caches the image URL back to database
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wineId = params.id

    // Fetch wine from database
    const wine = await prisma.wine.findUnique({
      where: { id: wineId },
      select: {
        id: true,
        name: true,
        vineyard: true,
        varietal: true,
        vintage: true,
        image: true,
      }
    })

    if (!wine) {
      return NextResponse.json(
        { error: 'Wine not found' },
        { status: 404 }
      )
    }

    // If wine already has an image, return it
    if (wine.image) {
      return NextResponse.json({ image: wine.image })
    }

    // First check for manual mapping (specific wine images we've curated)
    const manualMapping = findWineImageMapping(wine.name, wine.vineyard, wine.vintage)
    if (manualMapping) {
      // Cache the manual mapping to database
      try {
        await prisma.wine.update({
          where: { id: wineId },
          data: { image: manualMapping }
        })
        console.log(`✅ Cached manual image mapping for: ${wine.name} from ${wine.vineyard}`)
      } catch (error) {
        console.error('Error caching manual image:', error)
      }
      return NextResponse.json({
        image: manualMapping,
        cached: true
      })
    }

    // Try fetching from Vivino first (best source for wine bottle images)
    console.log(`🍷 Fetching image from Vivino for: ${wine.name} from ${wine.vineyard}`)
    const vivinoImage = await getVivinoWineImage(wine.name, wine.vineyard, wine.vintage)
    if (vivinoImage) {
      // Cache the Vivino image to database
      try {
        await prisma.wine.update({
          where: { id: wineId },
          data: { image: vivinoImage }
        })
        console.log(`✅ Cached Vivino image for: ${wine.name} from ${wine.vineyard}`)
      } catch (error) {
        console.error('Error caching Vivino image:', error)
      }
      return NextResponse.json({
        image: vivinoImage,
        cached: true,
        source: 'vivino'
      })
    }

    // Fallback to general image search (Unsplash)
    console.log(`Fetching image for wine: ${wine.name} from ${wine.vineyard}`)
    const imageUrl = await getWineBottleImage(
      wine.name,
      wine.vineyard,
      wine.varietal,
      wine.vintage
    )

    if (imageUrl) {
      // Cache the image URL in database for future use
      // Cache any image URL (including placeholders) so we don't keep searching
      // But mark placeholders differently
      const isPlaceholder = imageUrl.includes('photo-1510812431401') || 
                           imageUrl.includes('photo-1553361371') || 
                           imageUrl.includes('photo-1513475382585')
      
      if (!isPlaceholder) {
        // Only cache non-placeholder images
        try {
          await prisma.wine.update({
            where: { id: wineId },
            data: { image: imageUrl }
          })
          console.log(`Cached image for ${wine.name}: ${imageUrl.substring(0, 50)}...`)
        } catch (error) {
          console.error('Error caching wine image:', error)
          // Continue even if caching fails
        }
      }

      return NextResponse.json({
        image: imageUrl,
        cached: !isPlaceholder
      })
    }

    // Fallback to placeholder
    const { getWineBottlePlaceholder } = await import('@/lib/wine-image-utils')
    return NextResponse.json({
      image: getWineBottlePlaceholder(wine.varietal),
      cached: false
    })
  } catch (error) {
    console.error('Error fetching wine image:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wine image' },
      { status: 500 }
    )
  }
}




