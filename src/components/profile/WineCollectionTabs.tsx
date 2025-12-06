'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
// UserWineStatus values as strings
const USER_WINE_STATUS = {
  WANT_TO_TRY: 'WANT_TO_TRY',
  TRIED: 'TRIED'
}
import WineCard from '@/components/wine/WineCard'
import StarRating from '@/components/reviews/StarRating'
import { UserWineWithDetails, UserWineWithReview } from '@/lib/types'
import { getWineBottleImageUrl } from '@/lib/wine-image-utils'

interface WineCollectionTabsProps {
  userWines: (UserWineWithDetails | UserWineWithReview)[]
  isOwnProfile?: boolean
  onWinesChange?: (wines: (UserWineWithDetails | UserWineWithReview)[]) => void
}

export default function WineCollectionTabs({ userWines: initialUserWines, isOwnProfile = false, onWinesChange }: WineCollectionTabsProps) {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<string>('MY_CELLAR')
  const [ratingStates, setRatingStates] = useState<Record<string, number>>({})
  const [localUserWines, setLocalUserWinesInternal] = useState(initialUserWines)
  
  // Track deleted wine IDs to prevent them from reappearing after RSC refresh
  const deletedWineIdsRef = useRef<Set<string>>(new Set())

  // Wrapper to update local state and notify parent
  const setLocalUserWines = useCallback((updater: (UserWineWithDetails | UserWineWithReview)[] | ((prev: (UserWineWithDetails | UserWineWithReview)[]) => (UserWineWithDetails | UserWineWithReview)[])) => {
    setLocalUserWinesInternal(prev => {
      const newWines = typeof updater === 'function' ? updater(prev) : updater
      // Notify parent of the change
      if (onWinesChange) {
        onWinesChange(newWines)
      }
      return newWines
    })
  }, [onWinesChange])

  // Sync local state when props change (e.g., after router.refresh())
  // But filter out any wines that were recently deleted to prevent stale data issues
  useEffect(() => {
    const filteredWines = initialUserWines.filter(
      wine => !deletedWineIdsRef.current.has(wine.id)
    )
    setLocalUserWinesInternal(filteredWines)
    // Also notify parent to keep stats in sync
    if (onWinesChange) {
      onWinesChange(filteredWines)
    }
  }, [initialUserWines, onWinesChange])
  const [updatingQuantity, setUpdatingQuantity] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({})
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [notesValues, setNotesValues] = useState<Record<string, string>>({})
  const notesEditRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [updatingNotes, setUpdatingNotes] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('dateAdded')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [filterVarietal, setFilterVarietal] = useState<string | null>(null)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [filterWineType, setFilterWineType] = useState<'red' | 'white' | null>(null)
  const [wineImages, setWineImages] = useState<Record<string, string>>({})

  const handleRatingChange = async (wineId: string, rating: number) => {
    if (!session?.user?.id) return

    console.log('Rating wine:', wineId, 'with rating:', rating)

    // Optimistically update the UI
    setRatingStates(prev => ({ ...prev, [wineId]: rating }))

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wineId,
          rating,
          notes: '',
        }),
      })

      if (response.ok) {
        console.log('Rating saved successfully')
        // Update local state - no page reload needed
        const updatedReview = await response.json().catch(() => null)
        if (updatedReview) {
          setRatingStates(prev => ({ ...prev, [wineId]: rating }))
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to save rating:', response.status, errorData)
        // Revert optimistic update on error
        setRatingStates(prev => {
          const newState = { ...prev }
          delete newState[wineId]
          return newState
        })
      }
    } catch (error) {
      console.error('Error saving rating:', error)
      // Revert optimistic update on error
      setRatingStates(prev => {
        const newState = { ...prev }
        delete newState[wineId]
        return newState
      })
    }
  }

  const handleAddToTried = async (wineId: string) => {
    if (!session?.user?.id) return

    // Find the current wine to check its quantity
    const currentWine = localUserWines.find(uw => uw.wine.id === wineId)
    if (!currentWine) return

    const currentQuantity = currentWine.quantity || 0
    const newQuantity = currentQuantity - 1

    // Store original state for potential revert
    const originalWine = currentWine
    const originalWines = [...localUserWines]

    // If quantity > 1, reduce quantity by 1 and ensure wine appears in Tried section
    // If quantity === 1, remove from cellar and move to tried
    if (currentQuantity > 1) {
      // Optimistically update the UI - reduce quantity
      setLocalUserWines(prev => prev.map(uw => 
        uw.wine.id === wineId ? { ...uw, quantity: newQuantity } : uw
      ))

      try {
        // Reduce quantity in cellar
        const quantityResponse = await fetch('/api/user-wines', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wineId,
            quantity: newQuantity,
          }),
        })

        if (!quantityResponse.ok) {
          console.error('Failed to reduce quantity')
          // Revert on error
          setLocalUserWines(originalWines)
          return
        }

        // Also ensure the wine is added to Tried section
        const triedResponse = await fetch('/api/user-wines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wineData: {
              name: currentWine.wine.name,
              vineyard: currentWine.wine.vineyard,
              region: currentWine.wine.region,
              country: currentWine.wine.country,
              varietal: currentWine.wine.varietal,
              vintage: currentWine.wine.vintage,
              description: currentWine.wine.description,
            },
            status: USER_WINE_STATUS.TRIED,
            addToCellar: false,
          }),
        })

        if (triedResponse.ok) {
          const triedResult = await triedResponse.json()
          
          // Restore cellar status with reduced quantity
          // This ensures wine appears in both cellar (with reduced qty) and Tried
          await fetch('/api/user-wines', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              wineId,
              quantity: newQuantity,
              inCellar: true,
            }),
          })

          // Add the new TRIED entry to local state
          if (triedResult.triedEntry) {
            setLocalUserWines(prev => {
              // Check if entry already exists (shouldn't, but be safe)
              const exists = prev.some(uw => uw.id === triedResult.triedEntry.id)
              if (exists) return prev
              
              // Create new entry with wine data from currentWine
              const newTriedEntry: UserWineWithDetails = {
                ...triedResult.triedEntry,
                wine: currentWine.wine
              }
              
              return [...prev, newTriedEntry]
            })
          }
        } else {
          // Revert on error
          setLocalUserWines(originalWines)
        }
      } catch (error) {
        console.error('Error reducing quantity and adding to tried:', error)
        // Revert on error
        setLocalUserWines(originalWines)
      }
    } else {
      // Quantity is 1, remove from cellar and create a new Tried entry
      // Optimistically update the UI - remove from cellar view
      setLocalUserWines(prev => prev.map(uw => 
        uw.wine.id === wineId ? { ...uw, inCellar: false, quantity: 0 } : uw
      ))

      try {
        // Remove from cellar
        const cellarResponse = await fetch('/api/user-wines', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wineId,
            inCellar: false,
          }),
        })

        if (!cellarResponse.ok) {
          console.error('Failed to remove wine from cellar')
          // Revert on error
          setLocalUserWines(originalWines)
          return
        }

        // Create a new Tried entry (allows duplicates)
        const triedResponse = await fetch('/api/user-wines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wineData: {
              name: currentWine.wine.name,
              vineyard: currentWine.wine.vineyard,
              region: currentWine.wine.region,
              country: currentWine.wine.country,
              varietal: currentWine.wine.varietal,
              vintage: currentWine.wine.vintage,
              description: currentWine.wine.description,
            },
            status: USER_WINE_STATUS.TRIED,
            addToCellar: false,
          }),
        })

        if (triedResponse.ok) {
          const triedResult = await triedResponse.json()
          
          // Update local state: remove from cellar (already done optimistically) and add to TRIED
          setLocalUserWines(prev => {
            // Remove from cellar if still there
            let updated = prev.map(uw => 
              uw.wine.id === wineId ? { ...uw, inCellar: false, quantity: 0 } : uw
            )
            
            // Add the new TRIED entry if it doesn't exist
            if (triedResult.triedEntry) {
              const exists = updated.some(uw => uw.id === triedResult.triedEntry.id)
              if (!exists) {
                const newTriedEntry: UserWineWithDetails = {
                  ...triedResult.triedEntry,
                  wine: currentWine.wine
                }
                updated = [...updated, newTriedEntry]
              }
            }
            
            return updated
          })
        } else {
          // Revert on error
          setLocalUserWines(originalWines)
        }
      } catch (error) {
        console.error('Error moving wine to tried:', error)
        // Revert on error
        setLocalUserWines(originalWines)
      }
    }
  }

  const handleRemoveFromCellar = async (wineId: string) => {
    if (!session?.user?.id) return

    // Store original state for potential revert
    const originalWines = localUserWines

    // Optimistically update the UI
    setLocalUserWines(prev => prev.filter(uw => uw.wine.id !== wineId))

    try {
      const response = await fetch('/api/user-wines', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wineId,
        }),
      })

      if (!response.ok) {
        console.error('Failed to remove wine from cellar')
        // Revert on error
        setLocalUserWines(originalWines)
      }
    } catch (error) {
      console.error('Error removing wine from cellar:', error)
      // Revert on error
      setLocalUserWines(originalWines)
    }
  }

  const handleRemoveFromTried = async (userWineId: string) => {
    if (!session?.user?.id) {
      console.error('No user session')
      throw new Error('No user session')
    }

    console.log('Removing wine from tried - userWineId:', userWineId)
    
    // Track this as deleted BEFORE the request to prevent RSC refresh from re-adding it
    deletedWineIdsRef.current.add(userWineId)

    // Store original state for potential revert
    const originalWines = [...localUserWines]

    // Optimistically update the UI - remove the specific entry
    setLocalUserWines(prev => {
      const filtered = prev.filter(uw => uw.id !== userWineId)
      console.log('Optimistic update - original count:', prev.length, 'new count:', filtered.length)
      return filtered
    })

    try {
      console.log('Sending DELETE request to /api/user-wines with userWineId:', userWineId)
      const response = await fetch('/api/user-wines', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWineId,
        }),
      })

      console.log('Response status:', response.status, 'ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to remove wine from tried:', response.status, errorData)
        // Revert on error - remove from deleted set and restore state
        deletedWineIdsRef.current.delete(userWineId)
        setLocalUserWines(originalWines)
        throw new Error(errorData.error || `Failed to remove wine: ${response.status}`)
      } else {
        const result = await response.json().catch(() => ({}))
        console.log('Successfully removed wine from tried:', result)
      }
    } catch (error) {
      console.error('Error removing wine from tried:', error)
      // Revert on error - remove from deleted set and restore state
      deletedWineIdsRef.current.delete(userWineId)
      setLocalUserWines(originalWines)
      throw error // Re-throw so the caller can handle it
    }
  }

  const handleQuantityChange = async (wineId: string, newQuantity: number) => {
    if (!session?.user?.id) return
    if (newQuantity < 0) return

    // Store original state for potential revert
    const originalWines = localUserWines

    // If quantity becomes 0, remove from cellar (but don't add to TRIED)
    // Wines should only be added to TRIED when explicitly clicking "Add to Tried" button
    if (newQuantity === 0) {
      setUpdatingQuantity(wineId)
      
      // Optimistically update the UI - remove from cellar
      setLocalUserWines(prev => prev.map(uw => 
        uw.wine.id === wineId ? { ...uw, inCellar: false, quantity: 0 } : uw
      ))

      try {
        // Remove from cellar by setting inCellar to false
        const response = await fetch('/api/user-wines', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wineId,
            inCellar: false,
            quantity: 0,
          }),
        })

        if (!response.ok) {
          console.error('Failed to remove from cellar')
          // Revert on error
          setLocalUserWines(originalWines)
        }
      } catch (error) {
        console.error('Error removing from cellar:', error)
        // Revert on error
        setLocalUserWines(originalWines)
      } finally {
        setUpdatingQuantity(null)
      }
      return
    }

    setUpdatingQuantity(wineId)

    // Optimistically update the UI
    setLocalUserWines(prev => prev.map(uw => 
      uw.wine.id === wineId ? { ...uw, quantity: newQuantity } : uw
    ))

    try {
      const response = await fetch('/api/user-wines', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wineId,
          quantity: newQuantity,
        }),
      })

      if (!response.ok) {
        console.error('Failed to update quantity')
        // Revert on error
        setLocalUserWines(originalWines)
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      // Revert on error
      setLocalUserWines(originalWines)
    } finally {
      setUpdatingQuantity(null)
    }
  }

  const handleNotesChange = async (wineId: string, notes: string) => {
    if (!session?.user?.id) return

    // Store original state for potential revert
    const originalWines = localUserWines
    const originalNotes = localUserWines.find(uw => uw.wine.id === wineId)?.notes

    setUpdatingNotes(wineId)

    // Optimistically update the UI
    setLocalUserWines(prev => prev.map(uw => 
      uw.wine.id === wineId ? { ...uw, notes: notes || null } : uw
    ))

    try {
      const response = await fetch('/api/user-wines', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wineId,
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) {
        console.error('Failed to update notes')
        // Revert on error
        setLocalUserWines(prev => prev.map(uw => 
          uw.wine.id === wineId ? { ...uw, notes: originalNotes || null } : uw
        ))
      } else {
        // Close editing mode on success
        setEditingNotes(prev => ({ ...prev, [wineId]: false }))
      }
    } catch (error) {
      console.error('Error updating notes:', error)
      // Revert on error
      setLocalUserWines(prev => prev.map(uw => 
        uw.wine.id === wineId ? { ...uw, notes: originalNotes || null } : uw
      ))
    } finally {
      setUpdatingNotes(null)
    }
  }

  const startEditingNotes = (wineId: string) => {
    const userWine = localUserWines.find(uw => uw.wine.id === wineId)
    setNotesValues(prev => ({ ...prev, [wineId]: userWine?.notes || '' }))
    setEditingNotes(prev => ({ ...prev, [wineId]: true }))
  }

  const cancelEditingNotes = (wineId: string) => {
    setEditingNotes(prev => ({ ...prev, [wineId]: false }))
    setNotesValues(prev => {
      const newValues = { ...prev }
      delete newValues[wineId]
      return newValues
    })
  }

  // Handle click outside to cancel editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(editingNotes).forEach(([wineId, isEditing]) => {
        if (isEditing) {
          const ref = notesEditRefs.current[wineId]
          if (ref && !ref.contains(event.target as Node)) {
            cancelEditingNotes(wineId)
          }
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingNotes])

  // Helper function to determine if a wine is red or white based on varietal
  const getWineType = (varietal: string | null | undefined): 'red' | 'white' | 'other' => {
    if (!varietal) return 'other'
    const varietalLower = varietal.toLowerCase()
    const redVarietals = [
      'cabernet sauvignon', 'merlot', 'pinot noir', 'syrah', 'shiraz', 'zinfandel',
      'sangiovese', 'tempranillo', 'malbec', 'cabernet franc', 'grenache', 'gamay',
      'nebbiolo', 'barbera', 'dolcetto', 'carmenère', 'petit verdot', 'mourvèdre',
      'carignan', 'cinsault', 'pinotage', 'tannat', 'agiorgitiko', 'xinomavro'
    ]
    const whiteVarietals = [
      'chardonnay', 'sauvignon blanc', 'pinot grigio', 'pinot gris', 'riesling',
      'gewürztraminer', 'viognier', 'chenin blanc', 'semillon', 'muscat',
      'albariño', 'verdejo', 'vermentino', 'grüner veltliner', 'torrontés',
      'moscato', 'pinot blanc', 'müller-thurgau', 'trebbiano', 'garganega'
    ]
    
    if (redVarietals.some(rv => varietalLower.includes(rv))) {
      return 'red'
    }
    if (whiteVarietals.some(wv => varietalLower.includes(wv))) {
      return 'white'
    }
    return 'other'
  }

  const tabs = [
    { 
      id: 'MY_CELLAR', 
      label: 'My Cellar', 
      icon: 'logo',
      description: 'Wines you currently own with your ratings'
    },
    { 
      id: USER_WINE_STATUS.TRIED, 
      label: 'Tried', 
      icon: '✅',
      description: 'Wines you\'ve tasted and rated'
    },
  ]

  const filteredWines = localUserWines.filter(userWine => {
    // Filter by tab
    let matchesTab = false
    if (activeTab === 'MY_CELLAR') {
      // My Cellar shows all wines in cellar, regardless of status
      // Cellar and TRIED are separate - you can have wines in cellar without them being TRIED
      matchesTab = userWine.inCellar === true
    } else {
      matchesTab = userWine.status === activeTab
    }
    
    // Filter by varietal if selected
    const matchesVarietal = !filterVarietal || userWine.wine.varietal === filterVarietal
    
    // Filter by wine type (red/white) if selected
    const wineType = getWineType(userWine.wine.varietal)
    const matchesWineType = !filterWineType || wineType === filterWineType
    
    return matchesTab && matchesVarietal && matchesWineType
  })

  // Get unique varietals from wines in current tab (before varietal filter)
  const tabFilteredWines = localUserWines.filter(userWine => {
    if (activeTab === 'MY_CELLAR') {
      // My Cellar shows all wines in cellar, regardless of status
      return userWine.inCellar === true
    }
    return userWine.status === activeTab
  })
  const availableVarietals = Array.from(new Set(tabFilteredWines.map(uw => uw.wine.varietal))).filter(Boolean).sort()

  // Sort filtered wines
  const sortedWines = [...filteredWines].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.wine.name.localeCompare(b.wine.name)
      case 'nameDesc':
        return b.wine.name.localeCompare(a.wine.name)
      case 'vintage':
        return (b.wine.vintage || 0) - (a.wine.vintage || 0)
      case 'vintageAsc':
        return (a.wine.vintage || 0) - (b.wine.vintage || 0)
      case 'rating':
        const ratingA = ratingStates[a.wine.id] !== undefined
          ? ratingStates[a.wine.id]
          : ('userReview' in a && a.userReview ? a.userReview.rating : a.wine.averageRating || 0)
        const ratingB = ratingStates[b.wine.id] !== undefined
          ? ratingStates[b.wine.id]
          : ('userReview' in b && b.userReview ? b.userReview.rating : b.wine.averageRating || 0)
        return ratingB - ratingA
      case 'ratingAsc':
        const ratingAAsc = ratingStates[a.wine.id] !== undefined
          ? ratingStates[a.wine.id]
          : ('userReview' in a && a.userReview ? a.userReview.rating : a.wine.averageRating || 0)
        const ratingBAsc = ratingStates[b.wine.id] !== undefined
          ? ratingStates[b.wine.id]
          : ('userReview' in b && b.userReview ? b.userReview.rating : b.wine.averageRating || 0)
        return ratingAAsc - ratingBAsc
      case 'vineyard':
        return a.wine.vineyard.localeCompare(b.wine.vineyard)
      case 'region':
        return a.wine.region.localeCompare(b.wine.region)
      case 'quantity':
        return (b.quantity || 0) - (a.quantity || 0)
      case 'dateAdded':
      default:
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    }
  })

  const getTabCount = (status: string) => {
    if (status === 'MY_CELLAR') {
      // My Cellar shows total bottles (sum of quantities), not unique wines
      // Cellar and TRIED are separate - you can have wines in cellar without them being TRIED
      return localUserWines
        .filter(wine => wine.inCellar === true)
        .reduce((sum, wine) => sum + (wine.quantity || 0), 0)
    }
    return localUserWines.filter(wine => wine.status === status).length
  }

  // Close dropdowns and reset filters when tab changes
  useEffect(() => {
    setSortDropdownOpen(false)
    setFilterDropdownOpen(false)
    setFilterVarietal(null)
    setFilterWineType(null)
  }, [activeTab])

  // Fetch wine images dynamically for wines without images
  useEffect(() => {
    const fetchMissingImages = async () => {
      const winesNeedingImages = sortedWines.filter(
        uw => !uw.wine.image && !wineImages[uw.wine.id]
      )

      for (const userWine of winesNeedingImages.slice(0, 10)) { // Limit to 10 at a time
        try {
          const response = await fetch(`/api/wines/${userWine.wine.id}/image`)
          if (response.ok) {
            const data = await response.json()
            if (data.image) {
              setWineImages(prev => ({
                ...prev,
                [userWine.wine.id]: data.image
              }))
            }
          }
        } catch (error) {
          console.error(`Error fetching image for wine ${userWine.wine.id}:`, error)
        }
      }
    }

    if (sortedWines.length > 0) {
      fetchMissingImages()
    }
  }, [sortedWines, wineImages]) // Run when wines or images change

  const sortOptions = [
    { value: 'dateAdded', label: 'Date Added (Newest)' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'nameDesc', label: 'Name (Z-A)' },
    { value: 'vintage', label: 'Vintage (Newest)' },
    { value: 'vintageAsc', label: 'Vintage (Oldest)' },
    { value: 'rating', label: 'Rating (Highest)' },
    { value: 'ratingAsc', label: 'Rating (Lowest)' },
    { value: 'vineyard', label: 'Vineyard (A-Z)' },
    { value: 'region', label: 'Region (A-Z)' },
    ...(activeTab === 'MY_CELLAR' ? [{ value: 'quantity', label: 'Quantity (Most)' }] : []),
  ]

  const getSortLabel = (value: string) => {
    return sortOptions.find(opt => opt.value === value)?.label || 'Sort By'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors duration-300">
      {/* Tab Navigation */}
      <div className="border-b border-cellar-200 dark:border-gray-600 mb-6">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8 flex-1">
            {tabs.map((tab) => {
              const count = getTabCount(tab.id)
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-[1.05rem] transition-colors ${
                    isActive
                      ? 'border-wine-500 dark:border-wine-400 text-wine-600 dark:text-wine-400'
                      : 'border-transparent text-cellar-500 dark:text-gray-400 hover:text-cellar-700 dark:hover:text-gray-200 hover:border-cellar-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {tab.icon === 'logo' ? (
                      <img 
                        src="/cellar-logo.png" 
                        alt="Cellar" 
                        width={40} 
                        height={40} 
                        className="object-contain logo-transparent"
                      />
                    ) : (
                      <span className="text-lg">{tab.icon}</span>
                    )}
                    <span>{tab.label}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      isActive 
                        ? 'bg-wine-100 dark:bg-wine-900/50 text-wine-600 dark:text-wine-400' 
                        : 'bg-cellar-100 dark:bg-gray-700 text-cellar-600 dark:text-gray-300'
                    }`}>
                      {count}
                    </span>
                  </div>
                </button>
              )
            })}
          </nav>
          
          {/* Filter and Sort Controls */}
          <div className="flex items-center gap-2">
            {/* Filter By Varietal Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setFilterDropdownOpen(!filterDropdownOpen)
                  setSortDropdownOpen(false)
                }}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
                  filterVarietal
                    ? 'bg-wine-50 dark:bg-wine-900/30 text-wine-600 dark:text-wine-400 border-wine-300 dark:border-wine-700'
                    : 'text-cellar-700 dark:text-gray-300 hover:text-cellar-900 dark:hover:text-gray-100 border-cellar-300 dark:border-gray-600 hover:bg-cellar-50 dark:hover:bg-gray-700'
                }`}
              >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>
                      {filterWineType ? (
                        <>
                          {filterWineType === 'red' ? (
                            <span className="inline-flex items-center">
                              <img
                                src="/icons/red-wine-glass.svg"
                                alt="Red wine"
                                className="w-4 h-4 mr-1"
                              />
                              <span>Red</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center">
                              <img
                                src="/icons/white-wine-glass.svg"
                                alt="White wine"
                                className="w-4 h-4 mr-1"
                              />
                              <span>White</span>
                            </span>
                          )}
                          {filterVarietal && ` • ${filterVarietal}`}
                          <span className="ml-1 text-xs opacity-75">({filteredWines.length})</span>
                        </>
                      ) : filterVarietal ? (
                        <>
                          {filterVarietal}
                          <span className="ml-1 text-xs opacity-75">({filteredWines.length})</span>
                        </>
                      ) : (
                        'Filter'
                      )}
                    </span>
                    {filterVarietal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setFilterVarietal(null)
                          setFilterDropdownOpen(false)
                        }}
                        className="ml-1 hover:bg-wine-100 dark:hover:bg-wine-800 rounded-full p-0.5"
                        title="Clear filter"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    <svg className={`w-4 h-4 transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {filterDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setFilterDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-cellar-200 dark:border-gray-700 z-20 max-h-64 overflow-y-auto">
                        <div className="py-1">
                          {/* Red/White Filter Options */}
                          <button
                            onClick={() => {
                              setFilterWineType(null)
                              setFilterVarietal(null)
                              setFilterDropdownOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              !filterWineType && !filterVarietal
                                ? 'bg-wine-50 dark:bg-wine-900/30 text-wine-600 dark:text-wine-400 font-medium'
                                : 'text-cellar-700 dark:text-gray-300 hover:bg-cellar-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            All Wines
                          </button>
                          <button
                            onClick={() => {
                              setFilterWineType(filterWineType === 'red' ? null : 'red')
                              setFilterDropdownOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              filterWineType === 'red'
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium'
                                : 'text-cellar-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              <img
                                src="/icons/red-wine-glass.svg"
                                alt="Red wine"
                                className="w-4 h-4"
                              />
                              <span>Red</span>
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setFilterWineType(filterWineType === 'white' ? null : 'white')
                              setFilterDropdownOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              filterWineType === 'white'
                                ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-medium'
                                : 'text-cellar-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              <img
                                src="/icons/white-wine-glass.svg"
                                alt="White wine"
                                className="w-4 h-4"
                              />
                              <span>White</span>
                            </span>
                          </button>
                          
                          {/* Divider */}
                          <div className="border-t border-cellar-200 dark:border-gray-600 my-1"></div>
                          
                          {/* Varietal Options */}
                          {availableVarietals.length > 0 ? availableVarietals.map((varietal) => (
                            <button
                              key={varietal}
                              onClick={() => {
                                setFilterVarietal(filterVarietal === varietal ? null : varietal)
                                setFilterDropdownOpen(false)
                              }}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                filterVarietal === varietal
                                  ? 'bg-wine-50 dark:bg-wine-900/30 text-wine-600 dark:text-wine-400 font-medium'
                                  : 'text-cellar-700 dark:text-gray-300 hover:bg-cellar-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {varietal}
                            </button>
                          )) : (
                            <div className="px-4 py-2 text-sm text-cellar-500 dark:text-gray-400">
                              No varietals in collection
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

              {/* Sort By Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setSortDropdownOpen(!sortDropdownOpen)
                    setFilterDropdownOpen(false)
                  }}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-cellar-700 dark:text-gray-300 hover:text-cellar-900 dark:hover:text-gray-100 border border-cellar-300 dark:border-gray-600 rounded-md hover:bg-cellar-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <span>Sort By</span>
                  <svg className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {sortDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setSortDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-cellar-200 dark:border-gray-700 z-20">
                      <div className="py-1">
                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSortBy(option.value)
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              sortBy === option.value
                                ? 'bg-wine-50 dark:bg-wine-900/30 text-wine-600 dark:text-wine-400 font-medium'
                                : 'text-cellar-700 dark:text-gray-300 hover:bg-cellar-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div>
              <h3 className="text-lg font-serif font-semibold text-cellar-800 dark:text-gray-200">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h3>
              <p className="text-sm text-cellar-600 dark:text-gray-400">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>

        {sortedWines.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">
              {activeTab === USER_WINE_STATUS.TRIED && '🍷'}
              {activeTab === 'MY_CELLAR' && (
                <img 
                  src="/cellar-logo.png" 
                  alt="Cellar" 
                  width={48} 
                  height={48} 
                  className="mx-auto object-contain logo-transparent"
                />
              )}
            </div>
            <h4 className="text-lg font-serif font-medium text-cellar-800 dark:text-gray-200 mb-2">
              {activeTab === USER_WINE_STATUS.TRIED && 'No wines tried yet'}
              {activeTab === 'MY_CELLAR' && 'No wines in cellar'}
            </h4>
            <p className="text-cellar-600 dark:text-gray-400 mb-4">
              {isOwnProfile ? (
                <>
                  {activeTab === USER_WINE_STATUS.TRIED && 'Start building your wine journey by rating wines you\'ve tasted.'}
                  {activeTab === 'MY_CELLAR' && 'Add wines to your cellar to track your current collection with ratings.'}
                </>
              ) : (
                'This user hasn\'t added any wines to this collection yet.'
              )}
            </p>
            {isOwnProfile && (
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <Link
                  href="/wines"
                  className="wine-gradient text-white px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity"
                >
                  Browse Wines
                </Link>
              </div>
            )}
          </div>
        ) : activeTab === USER_WINE_STATUS.TRIED ? (
          /* Table layout for Tried wines */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cellar-200 dark:border-gray-600">
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Cover</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Title</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Vineyard</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Rating</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Review</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Date Tried</th>
                </tr>
              </thead>
              <tbody>
                {sortedWines.map((userWine, index) => {
                  const userRating = 'userReview' in userWine && userWine.userReview 
                    ? userWine.userReview.rating 
                    : ratingStates[userWine.wine.id] || 0
                  
                  return (
                    <tr key={userWine.id} className="border-b border-cellar-100 dark:border-gray-700 hover:bg-cellar-50 dark:hover:bg-gray-800/50">
                      {/* Cover */}
                      <td className="py-4 px-2">
                        <div className="w-12 h-16 bg-gradient-to-br from-wine-100 to-wine-200 dark:from-wine-900 dark:to-wine-800 rounded flex items-center justify-center overflow-hidden">
                          <img 
                            src={getWineBottleImageUrl(
                              wineImages[userWine.wine.id] || userWine.wine.image, 
                              userWine.wine.name, 
                              userWine.wine.varietal
                            )} 
                            alt={`${userWine.wine.name} bottle`}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              // Fallback to a simple SVG if image fails to load
                              const target = e.target as HTMLImageElement
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjY0IiBmaWxsPSIjODU2NjQ0Ii8+PHBhdGggZD0iTTEwIDVIMzZWMjBIMTBaIiBmaWxsPSIjNjY0NDIyIi8+PHBhdGggZD0iTTEyIDhIMzRWMThIMTJaIiBmaWxsPSIjZmZmIi8+PC9zdmc+'
                            }}
                          />
                        </div>
                      </td>
                      
                      {/* Title */}
                      <td className="py-4 px-2">
                        <Link 
                          href={`/wines/${userWine.wine.id}`}
                          className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                        >
                          {userWine.wine.name}
                        </Link>
                        {userWine.wine.vintage && (
                          <div className="text-sm text-cellar-600 dark:text-gray-400">
                            ({userWine.wine.vintage})
                          </div>
                        )}
                      </td>
                      
                      {/* Vineyard */}
                      <td className="py-4 px-2">
                        <Link 
                          href={`/wineries/${encodeURIComponent(userWine.wine.vineyard)}`}
                          className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                        >
                          {userWine.wine.vineyard}
                        </Link>
                        <div className="text-sm text-cellar-600 dark:text-gray-400">
                          {userWine.wine.region}, {userWine.wine.country}
                        </div>
                      </td>
                      
                      {/* User Rating */}
                      <td className="py-4 px-2">
                        {isOwnProfile ? (
                          <StarRating
                            rating={userRating}
                            onRatingChange={(rating) => handleRatingChange(userWine.wine.id, rating)}
                            interactive={true}
                            size="xs"
                            showValue={true}
                          />
                        ) : (
                          <div className="flex text-orange-400">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isHalfStar = star - 0.5 <= userRating && userRating < star && userRating % 1 !== 0
                              const isFullStar = star <= userRating
                              return (
                                <span key={star} className={`text-sm ${
                                  isFullStar ? 'text-orange-400' : 
                                  isHalfStar ? 'text-orange-400 opacity-50' : 
                                  'text-gray-300 dark:text-gray-600'
                                }`}>
                                  {isHalfStar ? '☆' : '★'}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>
                      
                      {/* Review */}
                      <td className="py-4 px-2">
                        {isOwnProfile ? (
                          <Link href={`/wines/${userWine.wine.id}/review`} className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-sm">
                            {('userReview' in userWine && userWine.userReview) ? 'Edit review' : 'Write a review'}
                          </Link>
                        ) : (
                          <span className="text-cellar-600 dark:text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      
                      {/* Date Tried */}
                      <td className="py-4 px-2">
                        <div className="text-cellar-700 dark:text-gray-300 text-sm">
                          {('userReview' in userWine && userWine.userReview?.createdAt)
                            ? new Date(userWine.userReview.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'
                          }
                        </div>
                        {isOwnProfile && (
                          <div className="flex items-center space-x-2 mt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                // TODO: Implement edit date functionality
                                alert('Edit date functionality coming soon')
                              }}
                              className="text-teal-600 dark:text-teal-400 text-xs hover:underline"
                            >
                              [edit]
                            </button>
                            <Link 
                              href={`/wines/${userWine.wine.id}`} 
                              className="text-teal-600 dark:text-teal-400 text-xs hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              view »
                            </Link>
                            <button 
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                
                                const userWineId = userWine.id
                                console.log('Delete button clicked! userWineId:', userWineId, 'userWine object:', userWine)
                                
                                if (!userWineId) {
                                  console.error('userWine.id is undefined!', userWine)
                                  alert('Error: Unable to identify wine entry.')
                                  return
                                }
                                
                                const confirmed = window.confirm('Are you sure you want to remove this wine from your Tried collection?')
                                if (confirmed) {
                                  console.log('User confirmed, calling handleRemoveFromTried with userWineId:', userWineId)
                                  try {
                                    await handleRemoveFromTried(userWineId)
                                    console.log('Successfully completed handleRemoveFromTried')
                                  } catch (error) {
                                    console.error('Error in handleRemoveFromTried:', error)
                                    alert('Failed to remove wine. Please try again.')
                                  }
                                }
                              }}
                              className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 text-lg font-bold leading-none px-2 py-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer transition-all"
                              title="Remove from collection"
                              aria-label="Remove wine from Tried collection"
                              style={{ lineHeight: '1' }}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid layout for other tabs */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedWines.map((userWine, index) => (
              <div key={userWine.id} className="relative flex flex-col border-4 border-cellar-200 dark:border-gray-600 rounded-xl p-3 bg-cellar-50/50 dark:bg-gray-900/30">
                <WineCard 
                  wine={userWine.wine} 
                  showAddToCollection={false}
                  userRating={
                    ratingStates[userWine.wine.id] !== undefined
                      ? ratingStates[userWine.wine.id]
                      : ('userReview' in userWine && userWine.userReview 
                        ? userWine.userReview.rating 
                        : 0)
                  }
                  onRatingChange={activeTab === 'MY_CELLAR' && isOwnProfile ? (rating: number) => handleRatingChange(userWine.wine.id, rating) : undefined}
                  quantity={userWine.quantity}
                  onQuantityChange={activeTab === 'MY_CELLAR' && isOwnProfile ? (newQuantity: number) => handleQuantityChange(userWine.wine.id, newQuantity) : undefined}
                  updatingQuantity={updatingQuantity === userWine.wine.id}
                  isOwnProfile={activeTab === 'MY_CELLAR' && isOwnProfile}
                  testLayout={activeTab === 'MY_CELLAR' && isOwnProfile}
                  alignRatingBottom={activeTab === 'MY_CELLAR' && isOwnProfile}
                />
                
                {/* Collection Badge */}
                <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium text-white shadow-lg">
                  <div className={`px-2 py-1 rounded-md flex items-center gap-1 ${
                    activeTab === 'MY_CELLAR' ? 'bg-purple-600' : 'bg-green-600'
                  }`}>
                    {activeTab === 'MY_CELLAR' && (
                      <>
                        <img 
                          src="/cellar-logo.png" 
                          alt="Cellar" 
                          width={14} 
                          height={14} 
                          className="object-contain logo-transparent"
                        />
                        <span>In Cellar</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons for My Cellar (only for own profile) */}
                {activeTab === 'MY_CELLAR' && isOwnProfile && (
                  <div className="mt-3 space-y-3">
                    {/* Notes Section */}
                    <div className="pb-3 border-b border-cellar-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-cellar-700 dark:text-gray-300">
                          Notes
                        </label>
                      </div>
                      
                      {editingNotes[userWine.wine.id] ? (
                        <div 
                          ref={(el) => { notesEditRefs.current[userWine.wine.id] = el }}
                          className="space-y-2"
                        >
                          <textarea
                            value={notesValues[userWine.wine.id] || ''}
                            onChange={(e) => setNotesValues(prev => ({ ...prev, [userWine.wine.id]: e.target.value }))}
                            placeholder="Add your notes about this wine..."
                            className="w-full px-3 py-2 text-sm border border-cellar-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-cellar-800 dark:text-gray-200 placeholder-cellar-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-wine-500 dark:focus:ring-wine-400 resize-none"
                            rows={3}
                            disabled={updatingNotes === userWine.wine.id}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => cancelEditingNotes(userWine.wine.id)}
                              className="px-3 py-1 text-xs text-cellar-600 dark:text-gray-400 hover:text-cellar-800 dark:hover:text-gray-200 transition-colors"
                              disabled={updatingNotes === userWine.wine.id}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleNotesChange(userWine.wine.id, notesValues[userWine.wine.id] || '')}
                              className="px-3 py-1 text-xs bg-wine-600 hover:bg-wine-700 text-white rounded-md transition-colors disabled:opacity-50"
                              disabled={updatingNotes === userWine.wine.id}
                            >
                              {updatingNotes === userWine.wine.id ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="min-h-[3rem]">
                          {userWine.notes ? (
                            <div className="relative">
                              <div 
                                onClick={() => startEditingNotes(userWine.wine.id)}
                                className="cursor-pointer rounded-md p-2 -m-2 hover:bg-cellar-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <p 
                                  className={`text-sm text-cellar-700 dark:text-gray-300 break-words ${
                                    !expandedNotes[userWine.wine.id] ? 'line-clamp-3 overflow-hidden' : 'whitespace-pre-wrap'
                                  }`}
                                >
                                  {userWine.notes}
                                </p>
                              </div>
                              {userWine.notes.length > 100 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedNotes(prev => ({ 
                                      ...prev, 
                                      [userWine.wine.id]: !prev[userWine.wine.id] 
                                    }))
                                  }}
                                  className="text-xs text-wine-600 dark:text-wine-400 hover:text-wine-700 dark:hover:text-wine-300 font-medium mt-2"
                                >
                                  {expandedNotes[userWine.wine.id] ? 'Show less' : 'Show more'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div 
                              onClick={() => startEditingNotes(userWine.wine.id)}
                              className="cursor-pointer rounded-md p-2 -m-2 hover:bg-cellar-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <p className="text-sm text-cellar-400 dark:text-gray-500 italic">
                                Click to add notes about this wine...
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToTried(userWine.wine.id)}
                        className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        ✅ Add to Tried
                      </button>
                      <button
                        onClick={() => handleRemoveFromCellar(userWine.wine.id)}
                        className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Date Added (for non-cellar, non-tried tabs) */}
                {activeTab !== 'MY_CELLAR' && (
                  <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded-md text-xs">
                    Added {new Date(userWine.addedAt).toLocaleDateString()}
                  </div>
                )}

                {/* Remove Button for non-cellar tabs (only for own profile) */}
                {activeTab !== 'MY_CELLAR' && isOwnProfile && (
                  <button 
                    onClick={() => handleRemoveFromCellar(userWine.wine.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                    title="Remove from collection"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Statistics */}
        {sortedWines.length > 0 && (
          <div className="mt-8 pt-6 border-t border-cellar-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-cellar-800 dark:text-gray-200">{sortedWines.length}</div>
                <div className="text-sm text-cellar-600 dark:text-gray-400">Total Wines</div>
              </div>
              
              {(activeTab === USER_WINE_STATUS.TRIED || activeTab === 'MY_CELLAR') && (
                <>
                  <div>
                    <div className="text-2xl font-bold text-cellar-800 dark:text-gray-200">
                      {(() => {
                        const ratings = sortedWines.map(wine => {
                          // Get user's rating from ratingStates (most recent), userReview, or averageRating
                          return ratingStates[wine.wine.id] !== undefined
                            ? ratingStates[wine.wine.id]
                            : ('userReview' in wine && wine.userReview 
                              ? wine.userReview.rating 
                              : wine.wine.averageRating || 0)
                        }).filter(rating => rating > 0)
                        
                        return ratings.length > 0 
                          ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
                          : '0'
                      })()}
                    </div>
                    <div className="text-sm text-cellar-600 dark:text-gray-400">
                      {activeTab === 'MY_CELLAR' ? 'Your Avg Rating' : 'Avg Rating'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cellar-800 dark:text-gray-200">
                      {activeTab === 'MY_CELLAR' 
                        ? sortedWines.reduce((sum, wine) => sum + (wine.quantity || 0), 0)
                        : new Set(sortedWines.map(wine => wine.wine.country)).size
                      }
                    </div>
                    <div className="text-sm text-cellar-600 dark:text-gray-400">
                      {activeTab === 'MY_CELLAR' ? 'Total Bottles' : 'Countries'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
