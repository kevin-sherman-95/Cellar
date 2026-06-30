'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface AddWineModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (newUserWine?: any) => void
}

interface WineSuggestion {
  id: string
  name: string
  vineyard: string
  vintage: number | null
  varietal: string
  region: string
  country: string
}

type AutocompleteField = 'name' | 'winery'

const WINE_VARIETALS = [
  'Cabernet Sauvignon', 'Pinot Noir', 'Merlot', 'Chardonnay', 'Sauvignon Blanc',
  'Malbec', 'Syrah', 'Shiraz', 'Zinfandel', 'Riesling', 'Tempranillo',
  'Sangiovese', 'Nebbiolo', 'Grenache', 'Mourvedre', 'Viognier',
  'Pinot Grigio', 'Pinot Gris', 'Gewurztraminer', 'Semillon', 'Chenin Blanc',
  'Cabernet Franc', 'Petit Verdot', 'Carmenere', 'Petite Sirah', 'Barbera',
  'Primitivo', 'Prosecco', 'Champagne', 'Cava', 'Brut', 'Rosé', 'Rose',
  'Red Blend', 'White Blend', 'Sparkling', 'Other'
]

const COUNTRIES = [
  'United States', 'France', 'Italy', 'Spain', 'Australia', 'Argentina',
  'Chile', 'Germany', 'Portugal', 'New Zealand', 'South Africa', 'Other'
]

export default function AddWineModal({ isOpen, onClose, onSuccess }: AddWineModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [activeAutocomplete, setActiveAutocomplete] = useState<AutocompleteField | null>(null)
  const [suggestions, setSuggestions] = useState<WineSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1)
  
  const [formData, setFormData] = useState({
    name: '',
    winery: '',
    varietal: '',
    customVarietal: '',
    year: '',
    region: '',
    country: 'United States',
    quantity: '1',
    status: 'CELLAR' as 'WANT_TO_TRY' | 'TRIED' | 'CELLAR',
    dateAdded: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen || !activeAutocomplete) {
      setSuggestions([])
      return
    }

    const query = (activeAutocomplete === 'name' ? formData.name : formData.winery).trim()
    if (!query) {
      setSuggestions([])
      setIsLoadingSuggestions(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setIsLoadingSuggestions(true)

      try {
        const response = await fetch(
          `/api/wines/autocomplete?q=${encodeURIComponent(query)}&field=${activeAutocomplete}`,
          { signal: controller.signal }
        )

        if (!response.ok) throw new Error('Failed to load wine suggestions')

        const data = await response.json()
        setSuggestions(data.wines || [])
        setHighlightedSuggestion(-1)
      } catch (suggestionError) {
        if ((suggestionError as Error).name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingSuggestions(false)
      }
    }, 250)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [activeAutocomplete, formData.name, formData.winery, isOpen])

  if (!isOpen || !mounted) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    // Validation
    if (!formData.name.trim()) {
      setError('Wine name is required')
      return
    }
    if (!formData.winery.trim()) {
      setError('Winery is required')
      return
    }
    if (!formData.varietal) {
      setError('Wine type is required')
      return
    }
    if (formData.varietal === 'Other' && !formData.customVarietal.trim()) {
      setError('Please specify the wine type')
      return
    }

    setIsSubmitting(true)

    try {
      const wineData = {
        name: formData.name.trim(),
        vineyard: formData.winery.trim(),
        varietal: formData.varietal === 'Other' ? formData.customVarietal.trim() : formData.varietal,
        vintage: formData.year ? parseInt(formData.year) : undefined,
        region: formData.region.trim() || 'Unknown',
        country: formData.country || 'United States'
      }

      // Determine if adding to cellar and what status to use
      const addToCellar = formData.status === 'CELLAR'
      const status = formData.status === 'CELLAR' ? 'TRIED' : formData.status

      const response = await fetch('/api/user-wines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wineData,
          status,
          addToCellar,
          quantity: formData.status === 'CELLAR' ? parseInt(formData.quantity, 10) : undefined,
          dateAdded: formData.dateAdded
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add wine')
      }

      // Get the response data including the new userWine
      const responseData = await response.json()

      // Reset form
      setFormData({
        name: '',
        winery: '',
        varietal: '',
        customVarietal: '',
        year: '',
        region: '',
        country: 'United States',
        quantity: '1',
        status: 'CELLAR',
        dateAdded: new Date().toISOString().split('T')[0]
      })

      if (onSuccess) {
        // Pass the new userWine data for immediate UI update
        onSuccess(responseData.userWine)
      }
      
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add wine. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))

    if (name === 'name' || name === 'winery') {
      setActiveAutocomplete(name)
      setHighlightedSuggestion(-1)
    }
  }

  const handleSelectSuggestion = (wine: WineSuggestion) => {
    const isKnownVarietal = WINE_VARIETALS.includes(wine.varietal)

    setFormData(prev => ({
      ...prev,
      name: wine.name,
      winery: wine.vineyard,
      varietal: isKnownVarietal ? wine.varietal : 'Other',
      customVarietal: isKnownVarietal ? '' : wine.varietal,
      year: wine.vintage?.toString() || '',
      region: wine.region || '',
      country: wine.country || 'United States'
    }))
    setActiveAutocomplete(null)
    setSuggestions([])
    setHighlightedSuggestion(-1)
  }

  const handleAutocompleteKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    field: AutocompleteField
  ) => {
    if (activeAutocomplete !== field || suggestions.length === 0) {
      if (event.key === 'ArrowDown') setActiveAutocomplete(field)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedSuggestion(current => current < suggestions.length - 1 ? current + 1 : 0)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedSuggestion(current => current > 0 ? current - 1 : suggestions.length - 1)
    } else if (event.key === 'Enter' && highlightedSuggestion >= 0) {
      event.preventDefault()
      handleSelectSuggestion(suggestions[highlightedSuggestion])
    } else if (event.key === 'Escape') {
      setActiveAutocomplete(null)
      setSuggestions([])
    }
  }

  const renderSuggestions = (field: AutocompleteField) => {
    if (activeAutocomplete !== field) return null

    if (isLoadingSuggestions) {
      return (
        <div className="absolute right-3 top-9 z-20 h-4 w-4 animate-spin rounded-full border-2 border-cellar-300 border-t-wine-600" />
      )
    }

    if (suggestions.length === 0) return null

    return (
      <ul
        id={`${field}-wine-suggestions`}
        role="listbox"
        className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-cellar-200 bg-white py-1 shadow-xl"
      >
        {suggestions.map((wine, index) => (
          <li
            key={wine.id}
            id={`${field}-wine-suggestion-${index}`}
            role="option"
            aria-selected={highlightedSuggestion === index}
          >
            <button
              type="button"
              className={`w-full px-3 py-2 text-left transition-colors ${
                highlightedSuggestion === index ? 'bg-wine-50' : 'hover:bg-cellar-50'
              }`}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setHighlightedSuggestion(index)}
              onClick={() => handleSelectSuggestion(wine)}
            >
              <span className="block text-sm font-medium text-cellar-900">
                {field === 'winery' ? wine.vineyard : wine.name}
              </span>
              <span className="block truncate text-xs text-cellar-500">
                {field === 'winery' ? wine.name : wine.vineyard}
                {wine.vintage && ` · ${wine.vintage}`}
                {wine.varietal && ` · ${wine.varietal}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-bold text-cellar-900">
              Add Wine Manually
            </h2>
            <button
              onClick={onClose}
              className="text-cellar-400 hover:text-cellar-600 transition-colors"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Wine Name */}
            <div className="relative">
              <label htmlFor="name" className="block text-sm font-medium text-cellar-700 mb-1">
                Wine Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onFocus={() => setActiveAutocomplete('name')}
                onBlur={() => setTimeout(() => setActiveAutocomplete(null), 100)}
                onKeyDown={event => handleAutocompleteKeyDown(event, 'name')}
                required
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                placeholder="e.g., Cabernet Sauvignon Reserve"
                disabled={isSubmitting}
                autoComplete="off"
                role="combobox"
                aria-expanded={activeAutocomplete === 'name' && suggestions.length > 0}
                aria-controls="name-wine-suggestions"
                aria-activedescendant={
                  activeAutocomplete === 'name' && highlightedSuggestion >= 0
                    ? `name-wine-suggestion-${highlightedSuggestion}`
                    : undefined
                }
              />
              {renderSuggestions('name')}
            </div>

            {/* Winery */}
            <div className="relative">
              <label htmlFor="winery" className="block text-sm font-medium text-cellar-700 mb-1">
                Winery <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="winery"
                name="winery"
                value={formData.winery}
                onChange={handleInputChange}
                onFocus={() => setActiveAutocomplete('winery')}
                onBlur={() => setTimeout(() => setActiveAutocomplete(null), 100)}
                onKeyDown={event => handleAutocompleteKeyDown(event, 'winery')}
                required
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                placeholder="e.g., Napa Valley Winery"
                disabled={isSubmitting}
                autoComplete="off"
                role="combobox"
                aria-expanded={activeAutocomplete === 'winery' && suggestions.length > 0}
                aria-controls="winery-wine-suggestions"
                aria-activedescendant={
                  activeAutocomplete === 'winery' && highlightedSuggestion >= 0
                    ? `winery-wine-suggestion-${highlightedSuggestion}`
                    : undefined
                }
              />
              {renderSuggestions('winery')}
            </div>

            {/* Varietal */}
            <div>
              <label htmlFor="varietal" className="block text-sm font-medium text-cellar-700 mb-1">
                Type of Wine <span className="text-red-500">*</span>
              </label>
              <select
                id="varietal"
                name="varietal"
                value={formData.varietal}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                disabled={isSubmitting}
              >
                <option value="">Select a Wine Type</option>
                {WINE_VARIETALS.map(varietal => (
                  <option key={varietal} value={varietal}>{varietal}</option>
                ))}
              </select>
              {formData.varietal === 'Other' && (
                <input
                  type="text"
                  name="customVarietal"
                  value={formData.customVarietal}
                  onChange={handleInputChange}
                  placeholder="Enter wine type"
                  className="w-full mt-2 px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                  disabled={isSubmitting}
                />
              )}
            </div>

            {/* Year */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-cellar-700 mb-1">
                Year (Vintage)
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                placeholder="e.g., 2020"
                disabled={isSubmitting}
              />
            </div>

            {/* Region */}
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-cellar-700 mb-1">
                Region
              </label>
              <input
                type="text"
                id="region"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                placeholder="e.g., Napa Valley, Bordeaux"
                disabled={isSubmitting}
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-cellar-700 mb-1">
                Country
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                disabled={isSubmitting}
              >
                {!COUNTRIES.includes(formData.country) && (
                  <option value={formData.country}>{formData.country}</option>
                )}
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            {formData.status === 'CELLAR' && (
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-cellar-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  max="99"
                  required
                  className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Date Added */}
            <div>
              <label htmlFor="dateAdded" className="block text-sm font-medium text-cellar-700 mb-1">
                Date Added
              </label>
              <input
                type="date"
                id="dateAdded"
                name="dateAdded"
                value={formData.dateAdded}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-cellar-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                disabled={isSubmitting}
              >
                <option value="CELLAR">Add to My Cellar</option>
                <option value="WANT_TO_TRY">Want to Try</option>
                <option value="TRIED">Tried</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-cellar-300 text-cellar-700 rounded-md hover:bg-cellar-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 wine-gradient text-white px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Wine'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}


