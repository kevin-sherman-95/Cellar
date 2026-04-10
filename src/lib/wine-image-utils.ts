/**
 * Client-side utility functions for wine bottle images
 * Copyright Anysphere Inc.
 */

/**
 * Get a placeholder wine bottle image
 * Uses the Vivino fallback bottle image for consistency
 */
export function getWineBottlePlaceholder(varietal?: string | null): string {
  return 'https://web-common.vivino.com/assets/bottleShot/fallback_1.png'
}

/**
 * Routes an external image URL through the white-background-removal proxy.
 * SVGs, data URIs, and local paths are returned as-is.
 */
export function getProxiedImageUrl(url: string): string {
  if (
    url.startsWith('data:') ||
    url.startsWith('/') ||
    url.endsWith('.svg')
  ) {
    return url
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

/**
 * Client-side helper to get wine bottle image URL
 * Routes through the image proxy to remove white backgrounds.
 */
export function getWineBottleImageUrl(
  wineImage: string | null | undefined,
  wineName: string,
  varietal?: string | null
): string {
  if (wineImage) {
    return getProxiedImageUrl(wineImage)
  }
  
  return getProxiedImageUrl(getWineBottlePlaceholder(varietal))
}
