import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const WHITE_THRESHOLD = 240
const EDGE_FEATHER = 20

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    const decoded = decodeURIComponent(url)
    const response = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WineImageProxy/1.0)',
        Accept: 'image/*',
      },
    })

    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    const image = sharp(buffer)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': response.headers.get('content-type') || 'image/png',
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      })
    }

    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels = new Uint8Array(data)
    const { width, height, channels } = info

    for (let i = 0; i < pixels.length; i += channels) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]

      if (r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD) {
        pixels[i + 3] = 0
      } else if (r > WHITE_THRESHOLD - EDGE_FEATHER && g > WHITE_THRESHOLD - EDGE_FEATHER && b > WHITE_THRESHOLD - EDGE_FEATHER) {
        const brightness = (r + g + b) / 3
        const alpha = Math.round(255 * (1 - (brightness - (WHITE_THRESHOLD - EDGE_FEATHER)) / EDGE_FEATHER))
        pixels[i + 3] = Math.min(pixels[i + 3], Math.max(0, alpha))
      }
    }

    const processed = await sharp(Buffer.from(pixels), {
      raw: { width, height, channels: channels as 1 | 2 | 3 | 4 },
    })
      .png()
      .toBuffer()

    return new NextResponse(new Uint8Array(processed), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    })
  } catch (err) {
    console.error('Image proxy error:', err)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
