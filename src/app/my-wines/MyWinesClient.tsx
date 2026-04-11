'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [selectedTab, setSelectedTab] = useState<{ tab: string; key: number } | undefined>(undefined)
  const [selectedVarietal, setSelectedVarietal] = useState<{ varietal: string | null; key: number } | undefined>(undefined)
  const tabsRef = useRef<HTMLDivElement>(null)

  const scrollToTabs = (tab: string) => {
    setSelectedTab(prev => ({ tab, key: (prev?.key ?? 0) + 1 }))
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToTabsWithVarietal = (tab: string, varietal: string | null) => {
    setSelectedTab(prev => ({ tab, key: (prev?.key ?? 0) + 1 }))
    setSelectedVarietal(prev => ({ varietal, key: (prev?.key ?? 0) + 1 }))
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
  
  const totalBottles = inCellar.reduce((sum, wine) => sum + (wine.quantity || 0), 0)

  const stats = {
    tried: tried.length,
    inCellar: totalBottles,
  }

  // Compute varietal breakdown across the entire collection (cellar bottles by quantity)
  const varietalCounts = localUserWines.reduce<Record<string, number>>((acc, uw) => {
    const varietal = uw.wine?.varietal
    if (varietal) {
      acc[varietal] = (acc[varietal] || 0) + (uw.inCellar ? (uw.quantity || 1) : 1)
    }
    return acc
  }, {})

  const sortedVarietals = Object.entries(varietalCounts)
    .sort((a, b) => b[1] - a[1])

  const getWineType = (varietal: string): 'red' | 'white' | 'other' => {
    const v = varietal.toLowerCase()
    const reds = [
      'cabernet sauvignon', 'merlot', 'pinot noir', 'syrah', 'shiraz', 'zinfandel',
      'sangiovese', 'tempranillo', 'malbec', 'cabernet franc', 'grenache', 'gamay',
      'nebbiolo', 'barbera', 'dolcetto', 'carmenère', 'petit verdot', 'mourvèdre',
      'carignan', 'cinsault', 'pinotage', 'tannat', 'chianti', 'red blend', 'red',
    ]
    const whites = [
      'chardonnay', 'sauvignon blanc', 'pinot grigio', 'pinot gris', 'riesling',
      'gewürztraminer', 'viognier', 'chenin blanc', 'semillon', 'muscat',
      'albariño', 'verdejo', 'vermentino', 'grüner veltliner', 'torrontés',
      'moscato', 'pinot blanc', 'müller-thurgau', 'trebbiano', 'garganega',
      'prosecco', 'white blend', 'white',
    ]
    if (reds.some(r => v.includes(r))) return 'red'
    if (whites.some(w => v.includes(w))) return 'white'
    return 'other'
  }

  const handleWineAdded = (newUserWine?: any) => {
    // If we have the new wine data, add it immediately to local state
    if (newUserWine) {
      setLocalUserWines(prev => {
        // Check if wine already exists (in case of quantity increment)
        const existingIndex = prev.findIndex(uw => uw.wine.id === newUserWine.wine.id)
        if (existingIndex >= 0) {
          // Update existing entry
          const updated = [...prev]
          updated[existingIndex] = newUserWine
          return updated
        }
        // Add new wine at the beginning (most recent)
        return [newUserWine, ...prev]
      })
    }
    // Also refresh to ensure server and client stay in sync
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
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => scrollToTabs('TRIED')}
            className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-green-400 dark:hover:ring-green-500 transition-all"
          >
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.tried}</div>
            <div className="text-sm text-green-600 dark:text-green-300">Tried</div>
          </button>
          
          <button
            onClick={() => scrollToTabs('MY_CELLAR')}
            className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-purple-400 dark:hover:ring-purple-500 transition-all"
          >
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.inCellar}</div>
            <div className="text-sm text-purple-600 dark:text-purple-300">In Cellar</div>
          </button>
        </div>

        {sortedVarietals.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-cellar-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              Varietals
            </h3>
            <div className="flex flex-wrap gap-2">
              {sortedVarietals.map(([varietal, count]) => {
                const type = getWineType(varietal)
                const isWhite = type === 'white'
                return (
                  <button
                    key={varietal}
                    onClick={() => scrollToTabsWithVarietal('MY_CELLAR', varietal)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      isWhite
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:ring-2 hover:ring-amber-300 dark:hover:ring-amber-600'
                        : 'bg-wine-50 dark:bg-wine-900/20 text-wine-700 dark:text-wine-300 hover:bg-wine-100 dark:hover:bg-wine-900/40 hover:ring-2 hover:ring-wine-300 dark:hover:ring-wine-600'
                    }`}
                  >
                    <span>{varietal}</span>
                    <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center ${
                      isWhite
                        ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                        : 'bg-wine-200 dark:bg-wine-800 text-wine-800 dark:text-wine-200'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
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
      <div ref={tabsRef}>
        <WineCollectionTabs 
          userWines={localUserWines} 
          isOwnProfile={true} 
          onWinesChange={handleWinesChange}
          defaultTab={selectedTab?.tab}
          defaultTabKey={selectedTab?.key}
          defaultVarietal={selectedVarietal?.varietal}
          defaultVarietalKey={selectedVarietal?.key}
        />
      </div>

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
