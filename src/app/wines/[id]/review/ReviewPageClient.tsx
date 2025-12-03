'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReviewForm from '@/components/reviews/ReviewForm'

interface ReviewPageClientProps {
  wine: any
  existingReview?: any
}

export default function ReviewPageClient({ wine, existingReview }: ReviewPageClientProps) {
  const router = useRouter()

  const handleReviewSubmit = (reviewData: any) => {
    // Redirect back to wine detail page after successful submission
    setTimeout(() => {
      router.push(`/wines/${wine.id}`)
    }, 2000)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <ol className="flex items-center space-x-2 text-sm text-cellar-600">
          <li>
            <Link href="/" className="hover:text-wine-600">Home</Link>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <Link href="/wines" className="hover:text-wine-600">Wines</Link>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <Link href={`/wines/${wine.id}`} className="hover:text-wine-600">
              {wine.name}
            </Link>
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-cellar-800 font-medium">
              {existingReview ? 'Edit Review' : 'Write Review'}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Wine Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
            <div className="text-center mb-6">
              <div className="w-full h-48 bg-gradient-to-br from-wine-100 to-wine-200 rounded-lg flex items-center justify-center mb-4">
                {wine.image ? (
                  <img 
                    src={wine.image} 
                    alt={wine.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-6xl">🍷</span>
                )}
              </div>
              
              {wine.vintage && (
                <div className="inline-block bg-cellar-800 text-white px-3 py-1 rounded-md text-sm font-medium mb-2">
                  {wine.vintage}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-serif font-bold text-cellar-900">
                {wine.name}
              </h2>
              <Link 
                href={`/wineries/${encodeURIComponent(wine.vineyard)}`}
                className="font-medium text-cellar-700 hover:text-wine-600 transition-colors"
              >
                {wine.vineyard}
              </Link>
              <p className="text-cellar-600">{wine.region}, {wine.country}</p>
              <p className="text-cellar-600 italic">{wine.varietal}</p>
            </div>

            {wine.description && (
              <div className="mt-4 pt-4 border-t border-cellar-200">
                <p className="text-sm text-cellar-700 leading-relaxed">
                  {wine.description}
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-cellar-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-cellar-600">Reviews:</span>
                <span className="font-medium text-cellar-800">
                  {wine._count?.reviews || 0}
                </span>
              </div>
              
              {wine.alcoholContent && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-cellar-600">Alcohol:</span>
                  <span className="font-medium text-cellar-800">
                    {wine.alcoholContent}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Review Form */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-serif font-bold text-cellar-900 mb-2">
              {existingReview ? 'Edit Your Review' : 'Write a Review'}
            </h1>
            <p className="text-lg text-cellar-600">
              {existingReview 
                ? 'Update your tasting notes and rating for this wine'
                : 'Share your tasting experience with the community'
              }
            </p>
          </div>

          <ReviewForm 
            wineId={wine.id}
            onSubmit={handleReviewSubmit}
            existingReview={existingReview}
          />
        </div>
      </div>
    </div>
  )
}
