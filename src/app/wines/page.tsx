'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import WineCard from '@/components/wine/WineCard'
import SearchFilters from '@/components/wine/SearchFilters'
import { WineWithDetails, WineFilters } from '@/lib/types'

export default function WinesPage() {
  const searchParams = useSearchParams()
  const [wines, setWines] = useState<WineWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<WineFilters>({
    search: searchParams.get('q') || ''
  })
  const [sortBy, setSortBy] = useState('newest')

  const fetchWines = async (currentFilters: WineFilters) => {
    setLoading(true)
    try {
      console.log('🔍 Fetching wines with filters:', currentFilters)
      
      // Build query string for API
      const params = new URLSearchParams()
      if (currentFilters.search && currentFilters.search.trim()) {
        params.set('search', currentFilters.search.trim())
      }
      if (currentFilters.varietal) params.set('varietal', currentFilters.varietal)
      if (currentFilters.region) params.set('region', currentFilters.region)
      if (currentFilters.country) params.set('country', currentFilters.country)
      if (currentFilters.vintage) params.set('vintage', currentFilters.vintage.toString())
      
      const response = await fetch(`/api/wines?${params.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch wines')
      }
      
      const fetchedWines = data.wines || []
      console.log('✅ Fetched wines:', fetchedWines.length)
      
      // Sort wines based on selection
      let sortedWines = [...fetchedWines]
      switch (sortBy) {
        case 'rating':
          sortedWines.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
          break
        case 'name':
          sortedWines.sort((a, b) => a.name.localeCompare(b.name))
          break
        case 'vintage':
          sortedWines.sort((a, b) => (b.vintage || 0) - (a.vintage || 0))
          break
        case 'newest':
        default:
          // Already sorted by createdAt desc in the API
          break
      }
      
      setWines(sortedWines)
    } catch (error) {
      console.error('❌ Error fetching wines:', error)
      setWines([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWines(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy])

  const handleFiltersChange = (newFilters: WineFilters) => {
    setFilters(newFilters)
    
    // Update URL with search query
    if (newFilters.search) {
      const url = new URL(window.location.href)
      url.searchParams.set('q', newFilters.search)
      window.history.pushState({}, '', url.toString())
    } else {
      // Remove search param if no search query
      const url = new URL(window.location.href)
      url.searchParams.delete('q')
      window.history.pushState({}, '', url.toString())
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold text-cellar-900 mb-4">
          Browse Wines
        </h1>
        {filters.search ? (
          <div>
            <p className="text-lg text-cellar-600">
              Results for &quot;{filters.search}&quot;
            </p>
            {wines.length > 0 && wines.some(w => w.source === 'external') && (
              <p className="text-sm text-cellar-500 mt-1">
                Some results from external wine database
              </p>
            )}
          </div>
        ) : (
          <p className="text-lg text-cellar-600">
            Discover exceptional wines from around the world
          </p>
        )}
      </div>

      {/* Enhanced Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for wines, vineyards, regions, varietals..."
            value={filters.search || ''}
            onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value })}
            className="w-full pl-12 pr-16 py-4 border border-cellar-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-cellar-900 dark:text-gray-100 placeholder-cellar-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-wine-500 focus:border-wine-500 text-lg shadow-sm"
            autoFocus
          />
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-6 w-6 text-cellar-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {filters.search && (
            <button
              onClick={() => handleFiltersChange({ ...filters, search: '' })}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-cellar-400 hover:text-cellar-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Quick Search Suggestions */}
      {!filters.search && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-serif font-semibold text-cellar-800 dark:text-gray-100 mb-4">
            Popular Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Cabernet Sauvignon',
              'Bordeaux',
              'Napa Valley',
              'Pinot Noir',
              'Champagne',
              'Italian wines',
              'Under $50',
              '2018 vintage'
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleFiltersChange({ ...filters, search: suggestion })}
                className="px-4 py-2 bg-cellar-100 hover:bg-cellar-200 text-cellar-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 rounded-full text-sm font-medium transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <SearchFilters 
        onFiltersChange={handleFiltersChange}
        initialFilters={filters}
      />

      {/* Search Results */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-cellar-600">
          {loading ? (
            filters.search ? 'Searching...' : 'Loading...'
          ) : (
            <>
              {wines.length === 0 && filters.search ? (
                'No wines found'
              ) : (
                `${wines.length} ${wines.length === 1 ? 'wine' : 'wines'} found`
              )}
            </>
          )}
        </p>
        
        {wines.length > 0 && (
          <div className="flex items-center space-x-2">
            <label htmlFor="sort" className="text-sm font-medium text-cellar-700">
              Sort by:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
            >
              <option value="newest">Newest First</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name A-Z</option>
              <option value="vintage">Newest Vintage</option>
            </select>
          </div>
        )}
      </div>

      {/* Wine Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
              <div className="h-48 bg-cellar-200 rounded mb-4"></div>
              <div className="h-6 bg-cellar-200 rounded mb-2"></div>
              <div className="h-4 bg-cellar-200 rounded mb-2"></div>
              <div className="h-4 bg-cellar-200 rounded mb-4"></div>
              <div className="flex space-x-2">
                <div className="flex-1 h-10 bg-cellar-200 rounded"></div>
                <div className="flex-1 h-10 bg-cellar-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : wines.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-6">🔍</div>
          <h3 className="text-2xl font-serif font-semibold text-cellar-800 mb-4">
            {filters.search ? 'No wines found' : 'Start your search'}
          </h3>
          <p className="text-lg text-cellar-600 mb-6 max-w-2xl mx-auto">
            {filters.search ? (
              <>
                We couldn&apos;t find any wines matching your search. Try adjusting your search terms or browse our{' '}
                <button
                  onClick={() => handleFiltersChange({})}
                  className="text-wine-600 hover:text-wine-700 font-medium"
                >
                  full wine catalog
                </button>
                .
              </>
            ) : (
              'Use the search bar above to discover wines by name, vineyard, region, or varietal.'
            )}
          </p>
          
          {filters.search && (
            <div className="space-x-4">
              <button
                onClick={() => handleFiltersChange({ search: '' })}
                className="wine-gradient text-white px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                Clear Search
              </button>
              <button
                onClick={() => handleFiltersChange({})}
                className="border border-wine-600 text-wine-600 hover:bg-wine-50 px-6 py-3 rounded-md font-medium transition-colors"
              >
                Browse All Wines
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wines.map((wine) => (
              <WineCard
                key={wine.id}
                wine={wine}
                alignRatingBottom
              />
            ))}
          </div>
          
          {/* Search Tips */}
          {filters.search && (
            <div className="mt-12 bg-cellar-50 rounded-lg p-6">
              <h4 className="font-serif font-semibold text-cellar-800 mb-3">Search Tips</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-cellar-600">
                <div>
                  <strong>By Wine Name:</strong> &quot;Château Margaux&quot;, &quot;Opus One&quot;
                </div>
                <div>
                  <strong>By Vineyard:</strong> &quot;Domaine de la Côte&quot;, &quot;Screaming Eagle&quot;
                </div>
                <div>
                  <strong>By Region:</strong> &quot;Napa Valley&quot;, &quot;Bordeaux&quot;, &quot;Tuscany&quot;
                </div>
                <div>
                  <strong>By Varietal:</strong> &quot;Cabernet Sauvignon&quot;, &quot;Pinot Noir&quot;
                </div>
              </div>
            </div>
          )}

          {/* Load More Button (for future pagination) */}
          {wines.length > 0 && wines.length % 12 === 0 && (
            <div className="text-center mt-12">
              <button className="border border-wine-600 text-wine-600 hover:bg-wine-50 px-8 py-3 rounded-md font-medium transition-colors">
                Load More Wines
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
