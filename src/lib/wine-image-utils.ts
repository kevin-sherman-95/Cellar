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
 * Client-side helper to get wine bottle image URL
 * This can be used in components to get placeholder images
 */
export function getWineBottleImageUrl(
  wineImage: string | null | undefined,
  wineName: string,
  varietal?: string | null
): string {
  // If wine has an image, use it
  if (wineImage) {
    return wineImage
  }
  
  // Otherwise, return placeholder based on varietal
  return getWineBottlePlaceholder(varietal)
}
