'use client'

import { useState } from 'react'
import { WineFilters } from '@/lib/types'

interface SearchFiltersProps {
  onFiltersChange: (filters: WineFilters) => void
  initialFilters?: WineFilters
}

export default function SearchFilters({ onFiltersChange, initialFilters = {} }: SearchFiltersProps) {
  const [filters, setFilters] = useState<WineFilters>(initialFilters)
  const [isExpanded, setIsExpanded] = useState(true)

  const handleFilterChange = (key: keyof WineFilters, value: string | number | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value === '' ? undefined : value
    }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters: WineFilters = { search: filters.search } // Keep search term
    setFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    key !== 'search' && value !== undefined && value !== ''
  ).length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-cellar-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-serif font-semibold text-cellar-800 dark:text-gray-100">Filter Wines</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-wine-600 hover:text-wine-700 dark:text-wine-300 dark:hover:text-wine-200"
        >
          <span className="text-sm">
            {isExpanded ? 'Hide Filters' : 'Show Filters'}
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </span>
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Varietal Filter */}
            <div>
              <label htmlFor="varietal" className="block text-sm font-medium text-cellar-700 dark:text-gray-200 mb-1">
                Varietal
              </label>
              <select
                id="varietal"
                value={filters.varietal || ''}
                onChange={(e) => handleFilterChange('varietal', e.target.value)}
                className="w-full px-3 py-2 border border-cellar-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-cellar-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
              >
                <option value="">All Varietals</option>
                <option value="Cabernet Sauvignon">Cabernet Sauvignon</option>
                <option value="Merlot">Merlot</option>
                <option value="Pinot Noir">Pinot Noir</option>
                <option value="Chardonnay">Chardonnay</option>
                <option value="Sauvignon Blanc">Sauvignon Blanc</option>
                <option value="Riesling">Riesling</option>
                <option value="Syrah/Shiraz">Syrah/Shiraz</option>
                <option value="Nebbiolo">Nebbiolo</option>
                <option value="Sangiovese">Sangiovese</option>
                <option value="Tempranillo">Tempranillo</option>
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-cellar-700 dark:text-gray-200 mb-1">
                Region
              </label>
              <input
                id="region"
                type="text"
                value={filters.region || ''}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                placeholder="e.g., Napa Valley, Bordeaux"
                className="w-full px-3 py-2 border border-cellar-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-cellar-900 dark:text-gray-100 placeholder-cellar-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
              />
            </div>

            {/* Country Filter */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-cellar-700 dark:text-gray-200 mb-1">
                Country
              </label>
              <select
                id="country"
                value={filters.country || ''}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-cellar-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-cellar-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
              >
                <option value="">All Countries</option>
                <option value="France">France</option>
                <option value="Italy">Italy</option>
                <option value="Spain">Spain</option>
                <option value="United States">United States</option>
                <option value="Australia">Australia</option>
                <option value="Argentina">Argentina</option>
                <option value="Chile">Chile</option>
                <option value="Germany">Germany</option>
                <option value="Portugal">Portugal</option>
                <option value="New Zealand">New Zealand</option>
                <option value="South Africa">South Africa</option>
              </select>
            </div>

            {/* Vintage Filter */}
            <div>
              <label htmlFor="vintage" className="block text-sm font-medium text-cellar-700 dark:text-gray-200 mb-1">
                Vintage
              </label>
              <select
                id="vintage"
                value={filters.vintage || ''}
                onChange={(e) => handleFilterChange('vintage', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-cellar-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-cellar-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
              >
                <option value="">All Vintages</option>
                {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-cellar-700 dark:text-gray-200 mb-2">
              Minimum Rating
            </label>
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleFilterChange('minRating', filters.minRating === rating ? undefined : rating)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    filters.minRating === rating
                      ? 'bg-wine-600 text-white'
                      : 'bg-cellar-100 text-cellar-700 hover:bg-cellar-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{rating}</span>
                  <span className="text-yellow-400">★</span>
                  <span>+</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <div className="pt-4 border-t border-cellar-200">
              <button
                onClick={clearFilters}
                className="text-wine-600 hover:text-wine-700 dark:text-wine-300 dark:hover:text-wine-200 text-sm font-medium"
              >
                Clear all filters ({activeFilterCount})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
