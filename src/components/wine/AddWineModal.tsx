'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface AddWineModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

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
  
  const [formData, setFormData] = useState({
    name: '',
    winery: '',
    varietal: '',
    customVarietal: '',
    year: '',
    region: '',
    country: 'United States',
    status: 'CELLAR' as 'WANT_TO_TRY' | 'TRIED' | 'CELLAR'
  })

  useEffect(() => {
    setMounted(true)
  }, [])

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
          addToCellar
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add wine')
      }

      // Reset form
      setFormData({
        name: '',
        winery: '',
        varietal: '',
        customVarietal: '',
        year: '',
        region: '',
        country: 'United States',
        status: 'CELLAR'
      })

      if (onSuccess) {
        onSuccess()
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
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-cellar-700 mb-1">
                Wine Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                placeholder="e.g., Cabernet Sauvignon Reserve"
                disabled={isSubmitting}
              />
            </div>

            {/* Winery */}
            <div>
              <label htmlFor="winery" className="block text-sm font-medium text-cellar-700 mb-1">
                Winery <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="winery"
                name="winery"
                value={formData.winery}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                placeholder="e.g., Napa Valley Winery"
                disabled={isSubmitting}
              />
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
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
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


