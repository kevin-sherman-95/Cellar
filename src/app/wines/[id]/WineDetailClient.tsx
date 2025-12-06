'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getWineBottleImageUrl } from '@/lib/wine-image-utils'
// UserWineStatus values as strings
const USER_WINE_STATUS = {
  WANT_TO_TRY: 'WANT_TO_TRY',
  TRIED: 'TRIED'
}

interface WineDetailProps {
  wine: any // We'll type this properly later
}

export default function WineDetailClient({ wine }: WineDetailProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [userWineStatus, setUserWineStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [inCellar, setInCellar] = useState(false)
  const [cellarQuantity, setCellarQuantity] = useState(0)

  // Check if wine is already in user's cellar on mount
  useEffect(() => {
    const checkWineStatus = async () => {
      if (!session?.user?.id || !wine?.id) return

      try {
        const response = await fetch('/api/user-wines')
        if (response.ok) {
          const userWines = await response.json()
          const wineInCollection = userWines.find((uw: any) => uw.wineId === wine.id)
          
          if (wineInCollection) {
            setUserWineStatus(wineInCollection.status)
            setInCellar(wineInCollection.inCellar || false)
            setCellarQuantity(wineInCollection.quantity || 0)
          }
        }
      } catch (error) {
        console.error('Error checking wine status:', error)
      }
    }

    checkWineStatus()
  }, [session?.user?.id, wine?.id])

  // Safety check for wine object - MUST be after all hooks
  if (!wine) {
    return <div className="p-8 text-center">Wine not found</div>
  }

  const displayRating = wine.averageRating || 0
  const filledStars = Math.floor(displayRating)
  // Check for half star - round to nearest 0.5 to handle floating point precision
  const roundedRating = Math.round(displayRating * 2) / 2
  const hasHalfStar = roundedRating > filledStars && roundedRating < filledStars + 1
  const emptyStars = 5 - filledStars - (hasHalfStar ? 1 : 0)

  const addToCollection = async (status: string, addToCellar: boolean = false) => {
    if (!wine) {
      console.error('Wine object is missing')
      alert('Error: Wine information is missing')
      return
    }

    if (!session?.user) {
      // Redirect to sign in
      window.location.href = '/auth/signin'
      return
    }

    // If adding to cellar and wine is already in cellar, increment quantity instead
    if (addToCellar && inCellar) {
      if (!wine.id) {
        console.error('Wine ID is missing')
        alert('Error: Wine ID is missing')
        return
      }

      const newQuantity = cellarQuantity + 1
      const previousQuantity = cellarQuantity
      
      // Optimistically update UI immediately
      setCellarQuantity(newQuantity)
      setIsLoading(true)

      try {
        const response = await fetch('/api/user-wines', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wineId: wine.id,
            quantity: newQuantity,
          }),
        })

        let result = {}
        try {
          const text = await response.text()
          result = text ? JSON.parse(text) : {}
        } catch (parseError) {
          console.error('Error parsing response:', parseError)
        }
        
        if (!response.ok) {
          // Revert optimistic update on error
          setCellarQuantity(previousQuantity)
          setIsLoading(false)
          const errorMessage = result.error || result.details || 'Failed to update quantity'
          alert(`Failed to update quantity: ${errorMessage}`)
          return
        }

        // Success - update quantity from response if available
        if (result.quantity !== undefined) {
          setCellarQuantity(result.quantity)
        }
        setIsLoading(false)
        return
      } catch (error) {
        // Revert optimistic update on error
        setCellarQuantity(previousQuantity)
        setIsLoading(false)
        console.error('Error updating quantity:', error)
        alert('Failed to update quantity: ' + (error instanceof Error ? error.message : 'Unknown error'))
        return
      }
    }

    // Optimistically update UI immediately for instant feedback
    const previousQuantity = cellarQuantity
    const previousInCellar = inCellar
    if (addToCellar) {
      setUserWineStatus(USER_WINE_STATUS.WANT_TO_TRY)
      setInCellar(true)
      // If already in cellar, increment quantity; otherwise set to 1
      setCellarQuantity(inCellar ? cellarQuantity + 1 : 1)
    } else {
      setUserWineStatus(status)
    }

    setIsLoading(true)

    try {
      // Validate required wine data
      if (!wine?.name || !wine?.vineyard || !wine?.region || !wine?.country || !wine?.varietal) {
        setIsLoading(false)
        alert('Error: Missing required wine information')
        // Revert optimistic update
        if (addToCellar) {
          setUserWineStatus(null)
          setInCellar(previousInCellar)
          setCellarQuantity(previousQuantity)
        } else {
          setUserWineStatus(null)
        }
        return
      }

      const requestBody = {
        wineData: {
          name: wine.name,
          vineyard: wine.vineyard,
          region: wine.region,
          country: wine.country,
          varietal: wine.varietal,
          vintage: wine.vintage,
          description: wine.description,
          alcoholContent: wine.alcoholContent,
        },
        status: addToCellar ? 'WANT_TO_TRY' : status,
        addToCellar,
      }
      
      const response = await fetch('/api/user-wines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      let result = {}
      try {
        const text = await response.text()
        result = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
      }

      if (!response.ok) {
        // Revert optimistic update on error
        setUserWineStatus(null)
        setInCellar(previousInCellar)
        setCellarQuantity(previousQuantity)
        setIsLoading(false)
        const errorMessage = result.error || result.details || 'Failed to add wine to collection'
        console.error('API Error:', result)
        alert(`Failed to add wine to collection: ${errorMessage}`)
        return
      }

      // Success - update state from response if available
      if (addToCellar && result.quantity !== undefined) {
        setCellarQuantity(result.quantity)
        setInCellar(result.inCellar !== undefined ? result.inCellar : true)
      }
      setIsLoading(false)
      
      // If adding to TRIED (not cellar), navigate to my-wines page
      if (status === USER_WINE_STATUS.TRIED && !addToCellar) {
        window.location.href = '/my-wines'
      }
    } catch (error) {
      // Revert optimistic update on error
      setUserWineStatus(null)
      setInCellar(false)
      setCellarQuantity(0)
      setIsLoading(false)
      console.error('Error adding wine to collection:', error)
      alert('Failed to add wine to collection: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <ol className="flex items-center space-x-2 text-sm text-cellar-600 dark:text-gray-400">
          <li>
            <Link href="/" className="hover:text-wine-600 dark:hover:text-wine-400">Home</Link>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <Link href="/wines" className="hover:text-wine-600 dark:hover:text-wine-400">Wines</Link>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-cellar-800 dark:text-gray-100 font-medium">{wine.name}</span>
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Wine Image & Basic Info */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="relative">
                <div className="h-96 bg-gradient-to-br from-wine-100 to-wine-200 dark:from-wine-900 dark:to-wine-800 flex items-center justify-center">
                  <img 
                    src={getWineBottleImageUrl(wine.image, wine.name, wine.varietal)} 
                    alt={wine.name}
                    className="h-full w-full object-contain p-4"
                  />
                </div>
                
                {wine.vintage && (
                  <div className="absolute top-4 right-4 bg-cellar-800 dark:bg-gray-700 text-white px-3 py-2 rounded-md font-medium">
                    {wine.vintage}
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                {/* Collection Status Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        addToCollection(USER_WINE_STATUS.WANT_TO_TRY, true).catch((error) => {
                          console.error('Unhandled error in addToCollection:', error)
                          alert('An error occurred. Please try again.')
                        })
                      } catch (error) {
                        console.error('Error calling addToCollection:', error)
                        alert('An error occurred. Please try again.')
                      }
                    }}
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                      inCellar
                        ? 'bg-green-600 text-white'
                        : 'bg-wine-600 hover:bg-wine-700 dark:bg-wine-700 dark:hover:bg-wine-600 text-white'
                    } disabled:opacity-50`}
                  >
                    {inCellar 
                      ? (cellarQuantity > 1 
                          ? `✓ In Cellar (${cellarQuantity})` 
                          : '✓ In Cellar')
                      : '+ Add to Cellar'}
                  </button>
                  
                  <button
                    onClick={() => addToCollection(USER_WINE_STATUS.TRIED, false)}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-md font-medium transition-colors border border-green-600 dark:border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                  >
                    + Add to Tried
                  </button>
                  
                  <button
                    onClick={() => addToCollection(USER_WINE_STATUS.WANT_TO_TRY)}
                    disabled={isLoading || userWineStatus === USER_WINE_STATUS.WANT_TO_TRY}
                    className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                      userWineStatus === USER_WINE_STATUS.WANT_TO_TRY
                        ? 'bg-blue-600 dark:bg-blue-700 text-white cursor-default'
                        : 'border border-wine-600 dark:border-wine-400 text-wine-600 dark:text-wine-400 hover:bg-wine-50 dark:hover:bg-wine-900/20'
                    } disabled:opacity-50`}
                  >
                    {userWineStatus === USER_WINE_STATUS.WANT_TO_TRY ? '✓ Want to Try' : '+ Want to Try'}
                  </button>
                </div>

                {/* Wine Details */}
                <div className="space-y-2 pt-4 border-t border-cellar-200 dark:border-gray-700">
                  <div>
                    <span className="font-medium text-cellar-700 dark:text-gray-200">Alcohol:</span>
                    <span className="ml-2 text-cellar-600 dark:text-gray-400">
                      {wine.alcoholContent ? `${wine.alcoholContent}%` : 'Not specified'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-cellar-700 dark:text-gray-200">Reviews:</span>
                    <span className="ml-2 text-cellar-600 dark:text-gray-400">
                      {wine._count?.reviews || 0} {(wine._count?.reviews || 0) === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-cellar-700 dark:text-gray-200">In Collections:</span>
                    <span className="ml-2 text-cellar-600 dark:text-gray-400">
                      {wine._count?.userWines || 0} {(wine._count?.userWines || 0) === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Wine Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-serif font-bold text-cellar-900 dark:text-gray-100 mb-2">
              {wine.name}
            </h1>
            
            <div className="space-y-2 mb-6">
              <Link 
                href={`/wineries/${encodeURIComponent(wine.vineyard)}`}
                className="text-xl font-medium text-cellar-700 dark:text-gray-300 hover:text-wine-600 dark:hover:text-wine-400 transition-colors"
              >
                {wine.vineyard}
              </Link>
              <p className="text-lg text-cellar-600 dark:text-gray-400">{wine.region}, {wine.country}</p>
              <p className="text-lg text-cellar-600 dark:text-gray-400 italic">{wine.varietal}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className="flex text-2xl items-center">
                  {Array(filledStars).fill(0).map((_, i) => (
                    <span key={`filled-${i}`} className="text-yellow-400">★</span>
                  ))}
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
                  {Array(emptyStars).fill(0).map((_, i) => (
                    <span key={`empty-${i}`} className="text-gray-300 dark:text-gray-600">★</span>
                  ))}
                </div>
                <span className="text-xl font-medium text-cellar-800 dark:text-gray-100">
                  {displayRating > 0 ? displayRating.toFixed(1) : 'No ratings yet'}
                </span>
              </div>
            </div>

            {/* Description */}
            {wine.description && (
              <div className="prose max-w-none">
                <p className="text-cellar-700 dark:text-gray-200 leading-relaxed">{wine.description}</p>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif font-bold text-cellar-900 dark:text-gray-100">
                Reviews ({wine.reviews?.length || 0})
              </h2>
              
              {session?.user && (
                <Link
                  href={`/wines/${wine.id}/review`}
                  className="wine-gradient text-white px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                >
                  Write a Review
                </Link>
              )}
            </div>

            {!wine.reviews || wine.reviews.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-serif font-medium text-cellar-800 dark:text-gray-100 mb-2">
                  No reviews yet
                </h3>
                <p className="text-cellar-600 dark:text-gray-400">
                  Be the first to share your tasting experience!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {(wine.reviews || []).map((review: any) => (
                  <div key={review.id} className="border-b border-cellar-200 dark:border-gray-700 pb-6 last:border-b-0">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-wine-100 dark:bg-wine-900/40 rounded-full flex items-center justify-center">
                        {review.user.avatar ? (
                          <img 
                            src={review.user.avatar} 
                            alt={review.user.name || 'User'} 
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <span className="text-wine-600 dark:text-wine-300 font-medium">
                            {review.user.name?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      
                        <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-cellar-800 dark:text-gray-100">
                            {review.user.name || 'Anonymous'}
                          </span>
                            <div className="flex text-yellow-400 items-center">
                            {Array(Math.floor(review.rating)).fill(0).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                            {(() => {
                              const reviewFilledStars = Math.floor(review.rating)
                              const reviewRoundedRating = Math.round(review.rating * 2) / 2
                              const reviewHasHalfStar = reviewRoundedRating > reviewFilledStars && reviewRoundedRating < reviewFilledStars + 1
                              return reviewHasHalfStar && (
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
                              )
                            })()}
                          </div>
                          <span className="text-cellar-500 dark:text-gray-400 text-sm">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {review.notes && (
                          <p className="text-cellar-700 dark:text-gray-300 mb-3">{review.notes}</p>
                        )}
                        
                        {review.photos && (
                          (() => {
                            // Photos are stored as JSON string in database
                            const photos = typeof review.photos === 'string' 
                              ? JSON.parse(review.photos) 
                              : review.photos
                            return photos && photos.length > 0 && (
                              <div className="flex space-x-2 mb-3">
                                {photos.map((photo: string, index: number) => (
                                  <img 
                                    key={index}
                                    src={photo} 
                                    alt={`Review photo ${index + 1}`}
                                    className="w-20 h-20 object-cover rounded-md"
                                  />
                                ))}
                              </div>
                            )
                          })()
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-cellar-500 dark:text-gray-400">
                          <button className="hover:text-wine-600 dark:hover:text-wine-400 transition-colors">
                            👍 {review._count.likes} helpful
                          </button>
                          <button className="hover:text-wine-600 dark:hover:text-wine-400 transition-colors">
                            💬 {review._count.comments} replies
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
