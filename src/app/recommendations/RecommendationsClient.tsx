'use client'

import Link from 'next/link'
import WineCard from '@/components/wine/WineCard'
import { WineWithDetails } from '@/lib/types'

interface RecommendationsClientProps {
  featuredWines: WineWithDetails[]
  highestRatedWines: WineWithDetails[]
  personalizedWines: WineWithDetails[]
  isLoggedIn: boolean
}

function WineSection({ 
  title, 
  description, 
  icon, 
  wines,
  emptyMessage
}: { 
  title: string
  description: string
  icon: string
  wines: WineWithDetails[]
  emptyMessage?: string
}) {
  return (
    <section className="mb-16">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{icon}</span>
          <h2 className="text-2xl font-serif font-bold text-cellar-900 dark:text-gray-100">
            {title}
          </h2>
        </div>
        <p className="text-cellar-600 dark:text-gray-400 ml-12">
          {description}
        </p>
      </div>
      
      {wines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {wines.map((wine) => (
            <WineCard key={wine.id} wine={wine} alignRatingBottom />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <p className="text-cellar-500 dark:text-gray-400">
            {emptyMessage || 'No wines available yet.'}
          </p>
        </div>
      )}
    </section>
  )
}

export default function RecommendationsClient({
  featuredWines,
  highestRatedWines,
  personalizedWines,
  isLoggedIn
}: RecommendationsClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-wine-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-serif font-bold text-cellar-900 dark:text-gray-100 mb-4">
            Wine Recommendations
          </h1>
          <p className="text-lg text-cellar-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover your next favorite bottle with our curated recommendations
          </p>
        </div>

        {/* Personalized Section - Only show for logged in users */}
        {isLoggedIn && (
          <WineSection
            title="Based on Your Taste"
            description="Wines similar to those in your collection"
            icon="🎯"
            wines={personalizedWines}
            emptyMessage="Add wines to your collection to get personalized recommendations!"
          />
        )}

        {/* Not logged in prompt */}
        {!isLoggedIn && (
          <div className="mb-16 bg-gradient-to-r from-wine-100 to-amber-100 dark:from-wine-900/30 dark:to-amber-900/30 rounded-xl p-8 text-center">
            <span className="text-4xl mb-4 block">🎯</span>
            <h2 className="text-2xl font-serif font-bold text-cellar-900 dark:text-gray-100 mb-3">
              Get Personalized Recommendations
            </h2>
            <p className="text-cellar-600 dark:text-gray-400 mb-6 max-w-lg mx-auto">
              Sign in and add wines to your collection to receive tailored recommendations based on your taste preferences.
            </p>
            <Link
              href="/auth/signin"
              className="inline-block bg-wine-600 hover:bg-wine-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Sign In to Get Started
            </Link>
          </div>
        )}

        {/* Featured Wines Section */}
        <WineSection
          title="Featured Wines"
          description="Popular picks loved by our community"
          icon="⭐"
          wines={featuredWines}
          emptyMessage="Featured wines coming soon!"
        />

        {/* Highest Rated Section */}
        <WineSection
          title="Highest Rated"
          description="Top-rated wines by our connoisseurs"
          icon="🏆"
          wines={highestRatedWines}
          emptyMessage="No rated wines yet. Be the first to review!"
        />

        {/* Call to action */}
        <div className="text-center mt-12 pt-8 border-t border-cellar-200 dark:border-gray-700">
          <p className="text-cellar-600 dark:text-gray-400 mb-4">
            Looking for something specific?
          </p>
          <Link
            href="/wines"
            className="inline-block border-2 border-wine-600 dark:border-wine-400 text-wine-600 dark:text-wine-400 hover:bg-wine-50 dark:hover:bg-wine-900/20 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Browse All Wines
          </Link>
        </div>
      </div>
    </div>
  )
}




