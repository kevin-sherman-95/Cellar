'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import StarRating from './StarRating'

interface ReviewFormProps {
  wineId: string
  onSubmit?: (reviewData: any) => void
  existingReview?: any
}

export default function ReviewForm({ wineId, onSubmit, existingReview }: ReviewFormProps) {
  const { data: session } = useSession()
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [notes, setNotes] = useState(existingReview?.notes || '')
  
  // Parse photos from JSON string if it exists, otherwise default to empty array
  const parsePhotos = (photosData: any): string[] => {
    if (!photosData) return []
    if (Array.isArray(photosData)) return photosData
    if (typeof photosData === 'string') {
      try {
        const parsed = JSON.parse(photosData)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }
  
  const [photos, setPhotos] = useState<string[]>(parsePhotos(existingReview?.photos))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      setMessage('Please select a rating')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const reviewData = {
        wineId,
        rating,
        notes: notes.trim() || undefined,
        photos
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save review')
      }

      const result = await response.json()
      
      if (onSubmit) {
        onSubmit(result)
      }
      
      setMessage('Review saved successfully!')
      
      // Reset form if it's a new review
      if (!existingReview) {
        setRating(0)
        setNotes('')
        setPhotos([])
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error saving review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // TODO: Implement actual photo upload to Cloudinary
    // For now, we'll simulate photo URLs
    const newPhotos = Array.from(files).map((file, index) => 
      `https://via.placeholder.com/300x200?text=Photo+${photos.length + index + 1}`
    )
    
    setPhotos([...photos, ...newPhotos])
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  if (!session?.user) {
    return (
      <div className="bg-cellar-50 dark:bg-gray-800 border border-cellar-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <h3 className="text-lg font-serif font-semibold text-cellar-800 dark:text-gray-200 mb-2">
          Sign in to write a review
        </h3>
        <p className="text-cellar-600 dark:text-gray-400 mb-4">
          Share your tasting experience with the community
        </p>
        <a
          href="/auth/signin"
          className="wine-gradient text-white px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
        >
          Sign In
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
      <h3 className="text-xl font-serif font-bold text-cellar-900 dark:text-gray-100 mb-6">
        {existingReview ? 'Edit Your Review' : 'Write a Review'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-cellar-700 dark:text-gray-300 mb-2">
            Rating *
          </label>
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            interactive={true}
            size="lg"
            showValue={true}
          />
          <p className="text-xs text-cellar-500 dark:text-gray-400 mt-1">
            Click to rate this wine from 1 to 5 stars
          </p>
        </div>

        {/* Tasting Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-cellar-700 dark:text-gray-300 mb-2">
            Tasting Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-cellar-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-cellar-900 dark:text-gray-100 placeholder-cellar-400 dark:placeholder-gray-500 focus:outline-none focus:ring-wine-500 dark:focus:ring-wine-400 focus:border-wine-500 dark:focus:border-wine-400"
            placeholder="Share your tasting experience... What did you notice about the aroma, flavor, finish?"
            maxLength={1000}
          />
          <div className="flex justify-between text-xs text-cellar-500 dark:text-gray-400 mt-1">
            <span>Optional - but helps other wine lovers!</span>
            <span>{notes.length}/1000</span>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-cellar-700 dark:text-gray-300 mb-2">
            Photos
          </label>
          
          {/* Existing Photos */}
          {Array.isArray(photos) && photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo}
                    alt={`Review photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Upload Button */}
          <div className="border-2 border-dashed border-cellar-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <input
              type="file"
              id="photos"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <label
              htmlFor="photos"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <svg className="w-8 h-8 text-cellar-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <div className="text-sm">
                <span className="text-wine-600 dark:text-wine-400 font-medium">Click to upload</span>
                <span className="text-cellar-500 dark:text-gray-400"> or drag and drop</span>
              </div>
              <p className="text-xs text-cellar-500 dark:text-gray-400">
                PNG, JPG, GIF up to 5MB each (max 5 photos)
              </p>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4 border-t border-cellar-200 dark:border-gray-700">
          <div className="text-sm text-cellar-500 dark:text-gray-400">
            * Required fields
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="wine-gradient text-white px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : (existingReview ? 'Update Review' : 'Submit Review')}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('Error') 
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
              : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
          }`}>
            {message}
          </div>
        )}
      </form>

      {/* Review Guidelines */}
      <div className="mt-8 p-4 bg-cellar-50 dark:bg-gray-700/50 rounded-lg">
        <h4 className="font-medium text-cellar-800 dark:text-gray-200 mb-2">Review Guidelines</h4>
        <ul className="text-sm text-cellar-600 dark:text-gray-300 space-y-1">
          <li>• Be honest and descriptive about your tasting experience</li>
          <li>• Mention specific flavors, aromas, and characteristics you noticed</li>
          <li>• Consider the wine&apos;s balance, complexity, and finish</li>
          <li>• Photos of the bottle, glass, or food pairing are welcome</li>
          <li>• Be respectful of different tastes and preferences</li>
        </ul>
      </div>
    </div>
  )
}
