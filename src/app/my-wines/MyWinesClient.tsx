'use client'

import { useState, useEffect, useCallback } from 'react'
import WineCollectionTabs from '@/components/profile/WineCollectionTabs'
import AddWineModal from '@/components/wine/AddWineModal'
import { UserWineWithDetails, UserWineWithReview } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// UserWineStatus values as strings
const USER_WINE_STATUS = {
  WANT_TO_TRY: 'WANT_TO_TRY',
  TRIED: 'TRIED'
}

interface MyWinesClientProps {
  userWines?: (UserWineWithDetails | UserWineWithReview)[]
}

export default function MyWinesClient({ userWines = [] }: MyWinesClientProps) {
  const router = useRouter()
  const [isAddWineModalOpen, setIsAddWineModalOpen] = useState(false)

  // Ensure userWines is always an array and maintain local state
  const initialWines = Array.isArray(userWines) ? userWines : []
  const [localUserWines, setLocalUserWines] = useState(initialWines)
  
  // Sync with props when they change (e.g., after router.refresh())
  useEffect(() => {
    const newWines = Array.isArray(userWines) ? userWines : []
    setLocalUserWines(newWines)
  }, [userWines])

  // Callback for WineCollectionTabs to update the wine list
  const handleWinesChange = useCallback((updatedWines: (UserWineWithDetails | UserWineWithReview)[]) => {
    setLocalUserWines(updatedWines)
  }, [])

  // Calculate statistics using the shared local state
  const tried = localUserWines.filter(wine => wine.status === USER_WINE_STATUS.TRIED)
  const inCellar = localUserWines.filter(wine => wine.inCellar === true)
  
  const countries = new Set(localUserWines.map(wine => wine.wine?.country).filter(Boolean))
  const regions = new Set(localUserWines.map(wine => wine.wine?.region).filter(Boolean))
  
  const totalBottles = inCellar.reduce((sum, wine) => sum + (wine.quantity || 0), 0)
  
  const averageRating = tried.length > 0 
    ? tried.reduce((sum, wine) => sum + (wine.wine?.averageRating || 0), 0) / tried.length
    : 0

  const stats = {
    tried: tried.length,
    inCellar: totalBottles, // Use total bottles count to match My Cellar tab
    totalCountries: countries.size,
    totalRegions: regions.size,
    averageRating: Number(averageRating.toFixed(1))
  }

  const handleWineAdded = () => {
    // Refresh the page to show the new wine
    router.refresh()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold text-cellar-900 dark:text-gray-100 mb-4">
          My Wine Collection
        </h1>
        <p className="text-lg text-cellar-600 dark:text-gray-400">
          Track and organize all the wines in your journey
        </p>
      </div>

      {/* Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-serif font-semibold text-cellar-800 dark:text-gray-200 mb-4">
          Collection Overview
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.tried}</div>
            <div className="text-sm text-green-600 dark:text-green-300">Tried</div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.inCellar}</div>
            <div className="text-sm text-purple-600 dark:text-purple-300">In Cellar</div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-400">{stats.totalCountries}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Countries</div>
          </div>
          
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{stats.totalRegions}</div>
            <div className="text-sm text-indigo-600 dark:text-indigo-300">Regions</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-lg font-serif font-semibold text-cellar-800 dark:text-gray-200 mb-4">
          Quick Actions
        </h3>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setIsAddWineModalOpen(true)}
            className="flex items-center space-x-2 wine-gradient text-white px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Wine</span>
          </button>
          
          <Link
            href="/wines"
            className="flex items-center space-x-2 border border-wine-600 dark:border-wine-400 text-wine-600 dark:text-wine-400 hover:bg-wine-50 dark:hover:bg-wine-900/30 px-4 py-2 rounded-md font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Find Wines</span>
          </Link>
          
          {/* Removed Export Collection and Share Collection buttons per design update */}
        </div>
      </div>

      {/* Wine Collection Tabs */}
      <WineCollectionTabs 
        userWines={localUserWines} 
        isOwnProfile={true} 
        onWinesChange={handleWinesChange}
      />

      {/* Tips for New Users */}
      {localUserWines.length === 0 && (
        <div className="mt-8 bg-cellar-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-serif font-semibold text-cellar-800 dark:text-gray-200 mb-4">
            Getting Started with Your Wine Collection
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">🔍</div>
              <h4 className="font-semibold text-cellar-800 dark:text-gray-200 mb-2">Discover Wines</h4>
              <p className="text-sm text-cellar-600 dark:text-gray-400">
                Browse our catalog or search for specific wines, regions, or varietals you&apos;re interested in.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">⭐</div>
              <h4 className="font-semibold text-cellar-800 dark:text-gray-200 mb-2">Build Your Wishlist</h4>
              <p className="text-sm text-cellar-600 dark:text-gray-400">
                Add wines to your &quot;Want to Try&quot; list to keep track of bottles you&apos;d like to taste.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">✍️</div>
              <h4 className="font-semibold text-cellar-800 dark:text-gray-200 mb-2">Rate & Review</h4>
              <p className="text-sm text-cellar-600 dark:text-gray-400">
                After tasting, rate wines and write reviews to remember your experience and help others.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Wine Modal */}
      <AddWineModal
        isOpen={isAddWineModalOpen}
        onClose={() => setIsAddWineModalOpen(false)}
        onSuccess={handleWineAdded}
      />
    </div>
  )
}
