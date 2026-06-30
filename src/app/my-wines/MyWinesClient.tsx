'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import WineCollectionTabs from '@/components/profile/WineCollectionTabs'
import AddWineModal from '@/components/wine/AddWineModal'
import { UserWineWithDetails, UserWineWithReview } from '@/lib/types'
import { calculateCollectionStats, getWineType } from '@/lib/collection-stats'

import { useRouter } from 'next/navigation'

interface MyWinesClientProps {
  userWines?: (UserWineWithDetails | UserWineWithReview)[]
}

export default function MyWinesClient({ userWines = [] }: MyWinesClientProps) {
  const router = useRouter()
  const [isAddWineModalOpen, setIsAddWineModalOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<{ tab: string; key: number } | undefined>(undefined)
  const [selectedVarietal, setSelectedVarietal] = useState<{ varietal: string | null; key: number } | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
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

  const stats = calculateCollectionStats(localUserWines)

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
            onClick={() => scrollToTabs('MY_CELLAR')}
            className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-purple-400 dark:hover:ring-purple-500 transition-all"
          >
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.inCellar}</div>
            <div className="text-sm text-purple-600 dark:text-purple-300">In Cellar</div>
          </button>

          <button
            onClick={() => scrollToTabs('TRIED')}
            className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-green-400 dark:hover:ring-green-500 transition-all"
          >
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.tried}</div>
            <div className="text-sm text-green-600 dark:text-green-300">Tried</div>
          </button>
        </div>

        {stats.varietalCounts.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-cellar-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              Varietals
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats.varietalCounts.map(([varietal, count]) => {
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
          
          <button
            onClick={() => {
              setSearchOpen(prev => !prev)
              if (!searchOpen) {
                setTimeout(() => searchInputRef.current?.focus(), 50)
              } else {
                setSearchQuery('')
              }
            }}
            className="flex items-center space-x-2 border border-wine-600 dark:border-wine-400 text-wine-600 dark:text-wine-400 hover:bg-wine-50 dark:hover:bg-wine-900/30 px-4 py-2 rounded-md font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search Collection</span>
          </button>
        </div>

        {searchOpen && (
          <div className="mt-4 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cellar-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, vineyard, varietal, region..."
              className="w-full pl-9 pr-9 py-2 border border-cellar-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-cellar-900 dark:text-gray-100 placeholder-cellar-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-wine-400 dark:focus:ring-wine-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cellar-400 dark:text-gray-500 hover:text-cellar-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
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
          searchQuery={searchQuery}
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
