'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { WineWithDetails } from '@/lib/types'
import { getWineBottleImageUrl } from '@/lib/wine-image-utils'
import StarRating from '@/components/reviews/StarRating'

interface WineCardProps {
  wine: WineWithDetails
  showAddToCollection?: boolean
  onAddSuccess?: () => void
  // Optional props for interactive rating and quantity (used in WineCollectionTabs)
  userRating?: number
  onRatingChange?: (rating: number) => void
  quantity?: number
  onQuantityChange?: (quantity: number) => void
  updatingQuantity?: boolean
  isOwnProfile?: boolean
  testLayout?: boolean // For test card comparison - vertical, centered layout
  alignRatingBottom?: boolean // Optional: align rating/Qty block to bottom of card body
}

export default function WineCard({ 
  wine, 
  showAddToCollection = true, 
  onAddSuccess,
  userRating,
  onRatingChange,
  quantity,
  onQuantityChange,
  updatingQuantity = false,
  isOwnProfile = false,
  testLayout = false,
  alignRatingBottom = false
}: WineCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isAddingToCellar, setIsAddingToCellar] = useState(false)
  const [isAddingToWantToTry, setIsAddingToWantToTry] = useState(false)
  const [addedToCellar, setAddedToCellar] = useState(false)
  const [addedToWantToTry, setAddedToWantToTry] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wineImage, setWineImage] = useState<string | null>(wine.image || null)
  const displayRating = wine.averageRating || 0
  const filledStars = Math.floor(displayRating)
  // Check for half star - round to nearest 0.5 to handle floating point precision
  const roundedRating = Math.round(displayRating * 2) / 2
  const hasHalfStar = roundedRating > filledStars && roundedRating < filledStars + 1
  const emptyStars = 5 - filledStars - (hasHalfStar ? 1 : 0)

  // Fetch wine image dynamically if not present and Unsplash is configured
  useEffect(() => {
    // Always try to fetch if wine doesn't have an image
    // The API will handle whether Unsplash is configured or not
    if (!wine.image) {
      fetch(`/api/wines/${wine.id}/image`)
        .then(res => res.json())
        .then(data => {
          if (data.image && data.image !== wineImage) {
            setWineImage(data.image)
          }
        })
        .catch(err => {
          console.error('Error fetching wine image:', err)
          // Fallback to placeholder is handled by getWineBottleImageUrl
        })
    } else {
      // Wine already has an image, use it
      setWineImage(wine.image)
    }
  }, [wine.id, wine.image])

  const handleAddToCellar = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    setIsAddingToCellar(true)
    setError(null)

    try {
      const response = await fetch('/api/user-wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wineData: {
            name: wine.name,
            vineyard: wine.vineyard,
            region: wine.region,
            country: wine.country,
            varietal: wine.varietal,
            vintage: wine.vintage,
            description: wine.description,
          },
          status: 'WANT_TO_TRY', // Use neutral status - cellar doesn't mean TRIED
          addToCellar: true,
        }),
      })

      const result = await response.json().catch(() => ({}))
      
      if (!response.ok) {
        const errorMessage = result.error || result.details || 'Failed to add wine to cellar'
        console.error('API Error:', result)
        throw new Error(errorMessage)
      }

      console.log('Successfully added wine to cellar:', result)
      setAddedToCellar(true)
      
      // Call the success callback if provided, otherwise refresh the page
      if (onAddSuccess) {
        onAddSuccess()
      } else {
        // Refresh the page to show the wine in the cellar
        // Use a small delay to ensure the database write has completed
        setTimeout(() => {
          // Try router.refresh first (works for server components)
          router.refresh()
          
          // If we're on the my-wines page, also force a reload to ensure data updates
          if (window.location.pathname === '/my-wines') {
            // Force a hard reload to ensure fresh data
            window.location.reload()
          }
        }, 200)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to cellar'
      setError(errorMessage)
      console.error('Error adding wine to cellar:', err)
    } finally {
      setIsAddingToCellar(false)
    }
  }

  const handleWantToTry = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    setIsAddingToWantToTry(true)
    setError(null)

    try {
      const response = await fetch('/api/user-wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wineData: {
            name: wine.name,
            vineyard: wine.vineyard,
            region: wine.region,
            country: wine.country,
            varietal: wine.varietal,
            vintage: wine.vintage,
            description: wine.description,
          },
          status: 'WANT_TO_TRY',
          addToCellar: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || 'Failed to add wine to want to try'
        throw new Error(errorMessage)
      }

      setAddedToWantToTry(true)
      onAddSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to want to try'
      setError(errorMessage)
      console.error('Error adding wine to want to try:', err)
    } finally {
      setIsAddingToWantToTry(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
      <Link href={`/wines/${wine.id}`}>
        <div className="relative">
          <div className="h-48 bg-gradient-to-br from-wine-100 to-wine-200 dark:from-wine-900 dark:to-wine-800 flex items-center justify-center overflow-hidden">
            <img 
              src={getWineBottleImageUrl(wineImage, wine.name, wine.varietal)} 
              alt={`${wine.name} bottle`}
              className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300 p-4"
              onError={(e) => {
                // Fallback to a wine bottle SVG if image fails to load
                const target = e.target as HTMLImageElement
                // SVG of a wine bottle silhouette
                target.src = 'data:image/svg+xml,' + encodeURIComponent(`
                  <svg width="120" height="300" viewBox="0 0 120 300" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="bottle" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#2d1810"/>
                        <stop offset="30%" style="stop-color:#4a2c2a"/>
                        <stop offset="70%" style="stop-color:#4a2c2a"/>
                        <stop offset="100%" style="stop-color:#2d1810"/>
                      </linearGradient>
                      <linearGradient id="neck" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#1a0f0a"/>
                        <stop offset="50%" style="stop-color:#3d2420"/>
                        <stop offset="100%" style="stop-color:#1a0f0a"/>
                      </linearGradient>
                    </defs>
                    <!-- Cork -->
                    <rect x="48" y="5" width="24" height="25" rx="2" fill="#c4a574"/>
                    <!-- Neck -->
                    <path d="M48 30 L48 80 Q48 90 45 95 L45 95 L75 95 Q72 90 72 80 L72 30 Z" fill="url(#neck)"/>
                    <!-- Shoulders and body -->
                    <path d="M45 95 Q25 105 25 130 L25 280 Q25 295 40 295 L80 295 Q95 295 95 280 L95 130 Q95 105 75 95 Z" fill="url(#bottle)"/>
                    <!-- Label area -->
                    <rect x="35" y="150" width="50" height="70" rx="3" fill="#f5f0e6" opacity="0.9"/>
                    <!-- Label lines -->
                    <rect x="42" y="165" width="36" height="3" fill="#8b4513" opacity="0.6"/>
                    <rect x="45" y="175" width="30" height="2" fill="#8b4513" opacity="0.4"/>
                    <rect x="45" y="182" width="30" height="2" fill="#8b4513" opacity="0.4"/>
                    <!-- Wine glass icon on label -->
                    <path d="M60 195 L55 205 L55 210 L53 210 L53 212 L67 212 L67 210 L65 210 L65 205 L60 195 M56 200 Q60 202 64 200" fill="none" stroke="#722f37" stroke-width="1.5"/>
                  </svg>
                `)
              }}
            />
          </div>
          
          {/* Vintage badge */}
          {wine.vintage && (
            <div className="absolute top-2 right-2 bg-cellar-800 dark:bg-gray-700 text-white px-2 py-1 rounded-md text-sm font-medium">
              {wine.vintage}
            </div>
          )}
          
          {/* External source badge */}
          {wine.source === 'external' && (
            <div className="absolute top-2 left-2 bg-blue-600 dark:bg-blue-700 text-white px-2 py-1 rounded-md text-xs font-medium">
              External
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-6 flex flex-col flex-1">
        <Link href={`/wines/${wine.id}`}>
          <h3 className="font-serif text-xl font-semibold text-cellar-800 dark:text-gray-200 mb-2 hover:text-wine-700 dark:hover:text-wine-400 transition-colors line-clamp-2">
            {wine.name}
          </h3>
        </Link>
        
        <div className="space-y-1 mb-3">
          <Link 
            href={`/wineries/${encodeURIComponent(wine.vineyard)}`}
            className="text-cellar-600 dark:text-gray-300 font-medium hover:text-wine-600 dark:hover:text-wine-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {wine.vineyard}
          </Link>
          <p className="text-cellar-500 dark:text-gray-400 text-sm">{wine.region}, {wine.country}</p>
          <p className="text-cellar-500 dark:text-gray-400 text-sm italic">{wine.varietal}</p>
        </div>
        
        {/* Rating and Quantity (interactive when props provided, otherwise show average rating) */}
        <div className={alignRatingBottom ? 'mt-auto' : ''}>
          {isOwnProfile && onRatingChange && onQuantityChange ? (
            testLayout ? (
              // Test layout: vertical, centered (stars above Qty)
              <div className="flex flex-col items-center justify-center gap-3 mt-2 mb-4">
                {/* Interactive Star Rating */}
                <div style={{ transform: 'scale(1.10)', transformOrigin: 'center' }}>
                  <StarRating
                    rating={userRating || 0}
                    onRatingChange={onRatingChange}
                    interactive={true}
                    size="xs"
                    showValue={true}
                    spacing="wide"
                  />
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-medium text-cellar-700 dark:text-gray-300">Qty:</span>
                  <div className="flex items-center gap-1 bg-cellar-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => onQuantityChange((quantity || 1) - 1)}
                      disabled={updatingQuantity}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-600 hover:bg-cellar-50 dark:hover:bg-gray-500 text-cellar-700 dark:text-gray-200 font-bold text-base transition-colors disabled:opacity-50 shadow-sm"
                      title="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold text-cellar-800 dark:text-gray-200 text-base">
                      {quantity || 1}
                    </span>
                    <button
                      onClick={() => onQuantityChange((quantity || 1) + 1)}
                      disabled={updatingQuantity}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-600 hover:bg-cellar-50 dark:hover:bg-gray-500 text-cellar-700 dark:text-gray-200 font-bold text-base transition-colors disabled:opacity-50 shadow-sm"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Original layout: horizontal (stars and Qty in one row)
              <div className="flex items-center justify-center gap-1 mb-4">
                {/* Interactive Star Rating */}
                <StarRating
                  rating={userRating || 0}
                  onRatingChange={onRatingChange}
                  interactive={true}
                  size="xs"
                  showValue={true}
                />

                {/* Divider */}
                <div className="h-6 w-px bg-cellar-200 dark:bg-gray-600"></div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-cellar-700 dark:text-gray-300">Qty:</span>
                  <div className="flex items-center gap-1 bg-cellar-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => onQuantityChange((quantity || 1) - 1)}
                      disabled={updatingQuantity}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-600 hover:bg-cellar-50 dark:hover:bg-gray-500 text-cellar-700 dark:text-gray-200 font-bold text-base transition-colors disabled:opacity-50 shadow-sm"
                      title="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold text-cellar-800 dark:text-gray-200 text-base">
                      {quantity || 1}
                    </span>
                    <button
                      onClick={() => onQuantityChange((quantity || 1) + 1)}
                      disabled={updatingQuantity}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-600 hover:bg-cellar-50 dark:hover:bg-gray-500 text-cellar-700 dark:text-gray-200 font-bold text-base transition-colors disabled:opacity-50 shadow-sm"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  {/* Filled stars */}
                  {Array(filledStars).fill(0).map((_, i) => (
                    <span key={`filled-${i}`} className="text-yellow-400">★</span>
                  ))}
                  {/* Half star */}
                  {hasHalfStar && (
                    <span 
                      className="relative inline-block"
                      style={{
                        background: 'linear-gradient(to right, rgb(250 204 21) 50%, rgb(209 213 219) 50%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        color: 'transparent'
                      }}
                    >
                      ★
                    </span>
                  )}
                  {/* Empty stars */}
                  {Array(emptyStars).fill(0).map((_, i) => (
                    <span key={`empty-${i}`} className="text-gray-300 dark:text-gray-600">★</span>
                  ))}
                </div>
                <span className="text-cellar-600 dark:text-gray-400 text-sm">
                  {displayRating > 0 ? displayRating.toFixed(1) : 'No ratings'}
                </span>
              </div>
              <span className="text-cellar-500 dark:text-gray-400 text-sm">
                {wine._count.reviews} {wine._count.reviews === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}
          
          {/* Action buttons */}
          {showAddToCollection && (
            <div className="flex flex-col gap-2 pt-4">
              {error && (
                <p className="text-red-500 text-xs text-center">{error}</p>
              )}
              <div className="flex space-x-2">
                <button 
                  onClick={handleAddToCellar}
                  disabled={isAddingToCellar || addedToCellar}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    addedToCellar 
                      ? 'bg-green-600 text-white cursor-default' 
                      : 'bg-wine-600 hover:bg-wine-700 dark:bg-wine-700 dark:hover:bg-wine-600 text-white disabled:opacity-50'
                  }`}
                >
                  {isAddingToCellar ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : addedToCellar ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Added!
                    </>
                  ) : (
                    'Add to Cellar'
                  )}
                </button>
                <button 
                  onClick={handleWantToTry}
                  disabled={isAddingToWantToTry || addedToWantToTry}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    addedToWantToTry 
                      ? 'bg-green-100 dark:bg-green-900/30 border border-green-600 dark:border-green-400 text-green-600 dark:text-green-400 cursor-default' 
                      : 'border border-wine-600 dark:border-wine-400 text-wine-600 dark:text-wine-400 hover:bg-wine-50 dark:hover:bg-wine-900/20 disabled:opacity-50'
                  }`}
                >
                  {isAddingToWantToTry ? (
                    <span className="inline-block w-4 h-4 border-2 border-wine-600 dark:border-wine-400 border-t-transparent rounded-full animate-spin" />
                  ) : addedToWantToTry ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Added!
                    </>
                  ) : (
                    'Want to Try'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
