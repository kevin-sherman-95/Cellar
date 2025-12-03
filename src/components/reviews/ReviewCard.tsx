'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import StarRating from './StarRating'

interface ReviewCardProps {
  review: any
  showWineInfo?: boolean
  onLike?: (reviewId: string) => void
  onComment?: (reviewId: string) => void
}

export default function ReviewCard({ 
  review, 
  showWineInfo = false, 
  onLike, 
  onComment 
}: ReviewCardProps) {
  const { data: session } = useSession()
  const [isLiked, setIsLiked] = useState(review.isLiked || false)
  const [likeCount, setLikeCount] = useState(review._count?.likes || 0)
  const [showAllPhotos, setShowAllPhotos] = useState(false)

  const handleLike = async () => {
    if (!session?.user) {
      // Redirect to sign in
      window.location.href = '/auth/signin'
      return
    }

    try {
      const newLikedState = !isLiked
      setIsLiked(newLikedState)
      setLikeCount((prev: number) => newLikedState ? prev + 1 : prev - 1)
      
      if (onLike) {
        onLike(review.id)
      }
      
      // TODO: Implement actual API call
    } catch (error) {
      // Revert on error
      setIsLiked(!isLiked)
      setLikeCount((prev: number) => isLiked ? prev + 1 : prev - 1)
      console.error('Error toggling like:', error)
    }
  }

  const handleComment = () => {
    if (onComment) {
      onComment(review.id)
    }
  }

  const displayPhotos = showAllPhotos ? review.photos : review.photos?.slice(0, 3)

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          {/* User Avatar */}
          <Link href={`/users/${review.user.id}`} className="flex-shrink-0">
            <div className="w-12 h-12 bg-wine-100 rounded-full flex items-center justify-center">
              {review.user.avatar ? (
                <img 
                  src={review.user.avatar} 
                  alt={review.user.name || 'User'} 
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-wine-600 font-semibold text-lg">
                  {review.user.name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
          </Link>

          {/* User Info & Rating */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Link 
                href={`/users/${review.user.id}`}
                className="font-semibold text-cellar-800 hover:text-wine-600 transition-colors"
              >
                {review.user.name || 'Anonymous'}
              </Link>
              <span className="text-cellar-500 text-sm">•</span>
              <span className="text-cellar-500 text-sm">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <StarRating rating={review.rating} size="sm" showValue={true} />
          </div>
        </div>

        {/* Actions Menu */}
        {session?.user?.id === review.user.id && (
          <div className="relative">
            <button className="text-cellar-400 hover:text-cellar-600 p-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Wine Info (if showing in feed context) */}
      {showWineInfo && review.wine && (
        <div className="mb-4 p-3 bg-cellar-50 rounded-lg">
          <Link 
            href={`/wines/${review.wine.id}`}
            className="flex items-center space-x-3 hover:bg-cellar-100 transition-colors rounded-md p-2 -m-2"
          >
            <div className="w-12 h-12 bg-wine-200 rounded-md flex items-center justify-center flex-shrink-0">
              🍷
            </div>
            <div>
              <h4 className="font-semibold text-cellar-800">{review.wine.name}</h4>
              <p className="text-sm text-cellar-600">
                {review.wine.vineyard} • {review.wine.vintage}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Review Content */}
      {review.notes && (
        <div className="mb-4">
          <p className="text-cellar-700 leading-relaxed whitespace-pre-wrap">
            {review.notes}
          </p>
        </div>
      )}

      {/* Photos */}
      {review.photos && review.photos.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {displayPhotos.map((photo: string, index: number) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`Review photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    // TODO: Open photo lightbox
                  }}
                />
              </div>
            ))}
          </div>
          
          {review.photos.length > 3 && !showAllPhotos && (
            <button
              onClick={() => setShowAllPhotos(true)}
              className="mt-2 text-sm text-wine-600 hover:text-wine-700 font-medium"
            >
              +{review.photos.length - 3} more photos
            </button>
          )}
          
          {showAllPhotos && review.photos.length > 3 && (
            <button
              onClick={() => setShowAllPhotos(false)}
              className="mt-2 text-sm text-cellar-600 hover:text-cellar-700 font-medium"
            >
              Show fewer photos
            </button>
          )}
        </div>
      )}

      {/* Interaction Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-cellar-200">
        <div className="flex items-center space-x-6">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
              isLiked 
                ? 'text-red-600 hover:text-red-700' 
                : 'text-cellar-600 hover:text-cellar-800'
            }`}
          >
            <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{likeCount}</span>
          </button>

          <button
            onClick={handleComment}
            className="flex items-center space-x-2 text-sm font-medium text-cellar-600 hover:text-cellar-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{review._count?.comments || 0}</span>
          </button>

          <button className="flex items-center space-x-2 text-sm font-medium text-cellar-600 hover:text-cellar-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>Share</span>
          </button>
        </div>

        {/* Helpful badge */}
        {likeCount > 10 && (
          <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            Helpful Review
          </div>
        )}
      </div>

      {/* Updated indicator */}
      {review.updatedAt !== review.createdAt && (
        <div className="mt-2 text-xs text-cellar-500">
          Edited {new Date(review.updatedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
