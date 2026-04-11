'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  defaultTab?: string
  defaultTabKey?: number
  defaultVarietal?: string | null
  defaultVarietalKey?: number
  searchQuery?: string
}

export default function WineCollectionTabs({ userWines: initialUserWines, isOwnProfile = false, onWinesChange, defaultTab, defaultTabKey, defaultVarietal, defaultVarietalKey, searchQuery = '' }: WineCollectionTabsProps) {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<string>(defaultTab || 'MY_CELLAR')
  const [notesModalWineId, setNotesModalWineId] = useState<string | null>(null)
  const [notesPopoverPos, setNotesPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const [editingNotesText, setEditingNotesText] = useState<string>('')
  const [originalNotesText, setOriginalNotesText] = useState<string>('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab)
    }
  }, [defaultTab, defaultTabKey])

  useEffect(() => {
    if (defaultVarietalKey !== undefined) {
      setFilterVarietal(defaultVarietal ?? null)
    }
  }, [defaultVarietal, defaultVarietalKey])
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
    if (onWinesChange && filteredWines.length !== initialUserWines.length) {
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
  const [filterRegion, setFilterRegion] = useState<string | null>(null)
  const [filterVineyard, setFilterVineyard] = useState<string | null>(null)
  const [filterSubmenu, setFilterSubmenu] = useState<'varietal' | 'region' | 'vineyard' | null>(null)
  const [wineImages, setWineImages] = useState<Record<string, string>>({})
  const [addingToTriedWineId, setAddingToTriedWineId] = useState<string | null>(null)
  const [editingDateId, setEditingDateId] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, { rating?: number; date?: string }>>({})

  const savePending = async (userWine: (UserWineWithDetails | UserWineWithReview)) => {
    const pending = pendingChanges[userWine.id]
    if (!pending) return

    if (pending.rating !== undefined) {
      await handleRatingChange(userWine.wine.id, pending.rating)
    }
    if (pending.date !== undefined) {
      await handleDateChange(userWine.id, pending.date)
    }

    setPendingChanges(prev => {
      const next = { ...prev }
      delete next[userWine.id]
      return next
    })
  }

  const cancelPending = (userWine: (UserWineWithDetails | UserWineWithReview)) => {
    const pending = pendingChanges[userWine.id]
    if (!pending) return

    if (pending.rating !== undefined) {
      const originalRating = 'userReview' in userWine && userWine.userReview
        ? userWine.userReview.rating
        : 0
      setRatingStates(prev => ({ ...prev, [userWine.wine.id]: originalRating }))
    }

    setPendingChanges(prev => {
      const next = { ...prev }
      delete next[userWine.id]
      return next
    })
  }

  const handleDateChange = async (userWineId: string, newDate: string) => {
    if (!session?.user?.id || !newDate) return
    setEditingDateId(null)

    const originalWines = [...localUserWines]
    const dateValue = new Date(newDate + 'T12:00:00')

    setLocalUserWines(prev => prev.map(uw =>
      uw.id === userWineId ? { ...uw, addedAt: dateValue as any } : uw
    ))

    try {
      const res = await fetch('/api/user-wines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWineId, addedAt: dateValue.toISOString() }),
      })
      if (!res.ok) setLocalUserWines(originalWines)
    } catch {
      setLocalUserWines(originalWines)
    }
  }

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
    if (addingToTriedWineId) return

    const currentWine = localUserWines.find(uw => uw.wine.id === wineId && uw.inCellar)
    if (!currentWine) return

    const currentQuantity = currentWine.quantity || 0
    const originalWines = [...localUserWines]

    setAddingToTriedWineId(wineId)

    if (currentQuantity > 1) {
      const newQuantity = currentQuantity - 1

      setLocalUserWines(prev => prev.map(uw =>
        uw.id === currentWine.id ? { ...uw, quantity: newQuantity } : uw
      ))

      try {
        const quantityResponse = await fetch('/api/user-wines', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wineId, quantity: newQuantity }),
        })

        if (!quantityResponse.ok) {
          setLocalUserWines(originalWines)
          return
        }

        const triedResponse = await fetch('/api/user-wines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

          if (triedResult.triedEntry) {
            setLocalUserWines(prev => {
              const exists = prev.some(uw => uw.id === triedResult.triedEntry.id)
              if (exists) return prev

              const newTriedEntry: UserWineWithDetails = {
                ...triedResult.triedEntry,
                wine: currentWine.wine,
              }
              return [...prev, newTriedEntry]
            })
          }
          setActiveTab(USER_WINE_STATUS.TRIED)
        } else {
          setLocalUserWines(originalWines)
        }
      } catch (error) {
        console.error('Error reducing quantity and adding to tried:', error)
        setLocalUserWines(originalWines)
      } finally {
        setAddingToTriedWineId(null)
      }
    } else {
      // Quantity is 0 or 1 — convert the cellar entry to TRIED in a single atomic PATCH
      setLocalUserWines(prev => prev.map(uw =>
        uw.id === currentWine.id
          ? { ...uw, inCellar: false, quantity: 0, status: USER_WINE_STATUS.TRIED }
          : uw
      ))

      try {
        const response = await fetch('/api/user-wines', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wineId,
            inCellar: false,
            quantity: 0,
            status: USER_WINE_STATUS.TRIED,
          }),
        })

        if (!response.ok) {
          setLocalUserWines(originalWines)
        } else {
          setActiveTab(USER_WINE_STATUS.TRIED)
        }
      } catch (error) {
        console.error('Error moving wine to tried:', error)
        setLocalUserWines(originalWines)
      } finally {
        setAddingToTriedWineId(null)
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

  const filteredWines = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return localUserWines.filter(userWine => {
      let matchesTab = false
      if (activeTab === 'MY_CELLAR') {
        matchesTab = userWine.inCellar === true
      } else {
        matchesTab = userWine.status === activeTab
      }

      const matchesVarietal = !filterVarietal || userWine.wine.varietal === filterVarietal
      const wineType = getWineType(userWine.wine.varietal)
      const matchesWineType = !filterWineType || wineType === filterWineType
      const matchesRegion = !filterRegion || userWine.wine.region === filterRegion
      const matchesVineyard = !filterVineyard || userWine.wine.vineyard === filterVineyard

      const matchesSearch = !query || [
        userWine.wine.name,
        userWine.wine.vineyard,
        userWine.wine.varietal,
        userWine.wine.region,
        userWine.wine.country,
      ].some(field => field?.toLowerCase().includes(query))

      return matchesTab && matchesVarietal && matchesWineType && matchesRegion && matchesVineyard && matchesSearch
    })
  }, [localUserWines, activeTab, filterVarietal, filterWineType, filterRegion, filterVineyard, searchQuery])

  const { availableVarietals, availableRegions, availableVineyards } = useMemo(() => {
    const tabWines = localUserWines.filter(userWine => {
      if (activeTab === 'MY_CELLAR') return userWine.inCellar === true
      return userWine.status === activeTab
    })
    return {
      availableVarietals: Array.from(new Set(tabWines.map(uw => uw.wine.varietal))).filter(Boolean).sort(),
      availableRegions: Array.from(new Set(tabWines.map(uw => uw.wine.region))).filter(Boolean).sort(),
      availableVineyards: Array.from(new Set(tabWines.map(uw => uw.wine.vineyard))).filter(Boolean).sort(),
    }
  }, [localUserWines, activeTab])

  const sortedWines = useMemo(() => {
    const getRating = (w: typeof filteredWines[number]) => {
      if (ratingStates[w.wine.id] !== undefined) return ratingStates[w.wine.id]
      if ('userReview' in w && w.userReview) return w.userReview.rating
      return w.wine.averageRating || 0
    }

    return [...filteredWines].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.wine.name.localeCompare(b.wine.name)
        case 'nameDesc': return b.wine.name.localeCompare(a.wine.name)
        case 'vintage': return (b.wine.vintage || 0) - (a.wine.vintage || 0)
        case 'vintageAsc': return (a.wine.vintage || 0) - (b.wine.vintage || 0)
        case 'rating': return getRating(b) - getRating(a)
        case 'ratingAsc': return getRating(a) - getRating(b)
        case 'vineyard': return a.wine.vineyard.localeCompare(b.wine.vineyard)
        case 'region': return a.wine.region.localeCompare(b.wine.region)
        case 'quantity': return (b.quantity || 0) - (a.quantity || 0)
        case 'dateAddedAsc': return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
        case 'dateAdded':
        default: return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      }
    })
  }, [filteredWines, sortBy, ratingStates])

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
    setFilterRegion(null)
    setFilterVineyard(null)
    setFilterSubmenu(null)
  }, [activeTab])

  const fetchedImageIdsRef = useRef<Set<string>>(new Set())

  // Stable list of wine IDs that need images (only changes when the actual wine list changes)
  const wineIdsNeedingImages = useMemo(() => {
    return localUserWines
      .filter(uw => !uw.wine.image)
      .map(uw => uw.wine.id)
  }, [localUserWines])

  useEffect(() => {
    const idsToFetch = wineIdsNeedingImages.filter(
      id => !wineImages[id] && !fetchedImageIdsRef.current.has(id)
    ).slice(0, 10)

    if (idsToFetch.length === 0) return

    idsToFetch.forEach(id => fetchedImageIdsRef.current.add(id))

    Promise.all(
      idsToFetch.map(async (wineId) => {
        try {
          const response = await fetch(`/api/wines/${wineId}/image`)
          if (response.ok) {
            const data = await response.json()
            if (data.image) return { id: wineId, image: data.image as string }
          }
        } catch { /* skip failed fetches */ }
        return null
      })
    ).then(results => {
      const batch: Record<string, string> = {}
      for (const r of results) {
        if (r) batch[r.id] = r.image
      }
      if (Object.keys(batch).length > 0) {
        setWineImages(prev => ({ ...prev, ...batch }))
      }
    })
  }, [wineIdsNeedingImages, wineImages])

  const sortOptions: { value: string; altValue: string | null; label: string; dirLabel: string; altDirLabel: string }[] = [
    { value: 'dateAdded', altValue: 'dateAddedAsc', label: 'Date Added', dirLabel: 'Newest', altDirLabel: 'Oldest' },
    { value: 'name', altValue: 'nameDesc', label: 'Name', dirLabel: 'A-Z', altDirLabel: 'Z-A' },
    { value: 'vintage', altValue: 'vintageAsc', label: 'Vintage', dirLabel: 'Newest', altDirLabel: 'Oldest' },
    { value: 'rating', altValue: 'ratingAsc', label: 'Rating', dirLabel: 'Highest', altDirLabel: 'Lowest' },
    ...(activeTab === 'MY_CELLAR' ? [{ value: 'quantity', altValue: null as string | null, label: 'Quantity', dirLabel: 'Most', altDirLabel: '' }] : []),
  ]

  const isAltSort = (option: typeof sortOptions[number]) => {
    return option.altValue != null && sortBy === option.altValue
  }

  const isSortActive = (option: typeof sortOptions[number]) => {
    return sortBy === option.value || (option.altValue != null && sortBy === option.altValue)
  }

  const handleSortClick = (option: typeof sortOptions[number]) => {
    if (isSortActive(option) && option.altValue != null) {
      setSortBy(sortBy === option.value ? option.altValue : option.value)
    } else {
      setSortBy(option.value)
    }
    setSortDropdownOpen(false)
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
                  filterVarietal || filterRegion || filterVineyard || filterWineType
                    ? 'bg-wine-50 dark:bg-wine-900/30 text-wine-600 dark:text-wine-400 border-wine-300 dark:border-wine-700'
                    : 'text-cellar-700 dark:text-gray-300 hover:text-cellar-900 dark:hover:text-gray-100 border-cellar-300 dark:border-gray-600 hover:bg-cellar-50 dark:hover:bg-gray-700'
                }`}
              >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>
                      {(() => {
                        const parts: string[] = []
                        if (filterWineType) parts.push(filterWineType === 'red' ? 'Red' : 'White')
                        if (filterVarietal) parts.push(filterVarietal)
                        if (filterRegion) parts.push(filterRegion)
                        if (filterVineyard) parts.push(filterVineyard)
                        if (parts.length === 0) return 'Filter'
                        return (
                          <>
                            {filterWineType === 'red' && (
                              <img src="/icons/red-wine-glass.svg" alt="Red wine" className="w-4 h-4 mr-1 inline" />
                            )}
                            {filterWineType === 'white' && (
                              <img src="/icons/white-wine-glass.svg" alt="White wine" className="w-4 h-4 mr-1 inline" />
                            )}
                            {parts.join(' • ')}
                            <span className="ml-1 text-xs opacity-75">({filteredWines.length})</span>
                          </>
                        )
                      })()}
                    </span>
                    {(filterVarietal || filterRegion || filterVineyard || filterWineType) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setFilterVarietal(null)
                          setFilterRegion(null)
                          setFilterVineyard(null)
                          setFilterWineType(null)
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
                        onClick={() => { setFilterDropdownOpen(false); setFilterSubmenu(null) }}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-cellar-200 dark:border-gray-700 z-20 max-h-72 overflow-y-auto">
                        <div className="py-1">
                          {filterSubmenu === null ? (
                            <>
                              {/* Top-level menu */}
                              <button
                                onClick={() => {
                                  setFilterWineType(null)
                                  setFilterVarietal(null)
                                  setFilterRegion(null)
                                  setFilterVineyard(null)
                                  setFilterDropdownOpen(false)
                                }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                  !filterWineType && !filterVarietal && !filterRegion && !filterVineyard
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
                                  <img src="/icons/red-wine-glass.svg" alt="Red wine" className="w-4 h-4" />
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
                                  <img src="/icons/white-wine-glass.svg" alt="White wine" className="w-4 h-4" />
                                  <span>White</span>
                                </span>
                              </button>

                              <div className="border-t border-cellar-200 dark:border-gray-600 my-1"></div>

                              {/* Varietal submenu trigger */}
                              <button
                                onClick={() => setFilterSubmenu('varietal')}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                                  filterVarietal
                                    ? 'text-wine-600 dark:text-wine-400 font-medium'
                                    : 'text-cellar-700 dark:text-gray-300 hover:bg-cellar-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <span>{filterVarietal ? `Varietal: ${filterVarietal}` : 'Varietal'}</span>
                                <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>

                              {/* Region submenu trigger */}
                              <button
                                onClick={() => setFilterSubmenu('region')}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                                  filterRegion
                                    ? 'text-wine-600 dark:text-wine-400 font-medium'
                                    : 'text-cellar-700 dark:text-gray-300 hover:bg-cellar-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <span>{filterRegion ? `Region: ${filterRegion}` : 'Region'}</span>
                                <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>

                              {/* Vineyard submenu trigger */}
                              <button
                                onClick={() => setFilterSubmenu('vineyard')}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                                  filterVineyard
                                    ? 'text-wine-600 dark:text-wine-400 font-medium'
                                    : 'text-cellar-700 dark:text-gray-300 hover:bg-cellar-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <span>{filterVineyard ? `Vineyard: ${filterVineyard}` : 'Vineyard'}</span>
                                <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Submenu with back button */}
                              <button
                                onClick={() => setFilterSubmenu(null)}
                                className="w-full text-left px-4 py-2 text-sm text-cellar-500 dark:text-gray-400 hover:bg-cellar-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span>Back</span>
                              </button>
                              <div className="border-t border-cellar-200 dark:border-gray-600 my-1"></div>

                              {filterSubmenu === 'varietal' && (
                                <>
                                  {filterVarietal && (
                                    <button
                                      onClick={() => {
                                        setFilterVarietal(null)
                                        setFilterSubmenu(null)
                                        setFilterDropdownOpen(false)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-cellar-500 dark:text-gray-400 hover:bg-cellar-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                      Clear varietal
                                    </button>
                                  )}
                                  {availableVarietals.length > 0 ? availableVarietals.map((varietal) => (
                                    <button
                                      key={varietal}
                                      onClick={() => {
                                        setFilterVarietal(filterVarietal === varietal ? null : varietal)
                                        setFilterSubmenu(null)
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
                                </>
                              )}

                              {filterSubmenu === 'region' && (
                                <>
                                  {filterRegion && (
                                    <button
                                      onClick={() => {
                                        setFilterRegion(null)
                                        setFilterSubmenu(null)
                                        setFilterDropdownOpen(false)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-cellar-500 dark:text-gray-400 hover:bg-cellar-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                      Clear region
                                    </button>
                                  )}
                                  {availableRegions.length > 0 ? availableRegions.map((region) => (
                                    <button
                                      key={region}
                                      onClick={() => {
                                        setFilterRegion(filterRegion === region ? null : region)
                                        setFilterSubmenu(null)
                                        setFilterDropdownOpen(false)
                                      }}
                                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                        filterRegion === region
                                          ? 'bg-wine-50 dark:bg-wine-900/30 text-wine-600 dark:text-wine-400 font-medium'
                                          : 'text-cellar-700 dark:text-gray-300 hover:bg-cellar-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      {region}
                                    </button>
                                  )) : (
                                    <div className="px-4 py-2 text-sm text-cellar-500 dark:text-gray-400">
                                      No regions in collection
                                    </div>
                                  )}
                                </>
                              )}

                              {filterSubmenu === 'vineyard' && (
                                <>
                                  {filterVineyard && (
                                    <button
                                      onClick={() => {
                                        setFilterVineyard(null)
                                        setFilterSubmenu(null)
                                        setFilterDropdownOpen(false)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-cellar-500 dark:text-gray-400 hover:bg-cellar-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                      Clear vineyard
                                    </button>
                                  )}
                                  {availableVineyards.length > 0 ? availableVineyards.map((vineyard) => (
                                    <button
                                      key={vineyard}
                                      onClick={() => {
                                        setFilterVineyard(filterVineyard === vineyard ? null : vineyard)
                                        setFilterSubmenu(null)
                                        setFilterDropdownOpen(false)
                                      }}
                                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                        filterVineyard === vineyard
                                          ? 'bg-wine-50 dark:bg-wine-900/30 text-wine-600 dark:text-wine-400 font-medium'
                                          : 'text-cellar-700 dark:text-gray-300 hover:bg-cellar-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      {vineyard}
                                    </button>
                                  )) : (
                                    <div className="px-4 py-2 text-sm text-cellar-500 dark:text-gray-400">
                                      No vineyards in collection
                                    </div>
                                  )}
                                </>
                              )}
                            </>
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
                        {sortOptions.map((option) => {
                          const active = isSortActive(option)
                          const alt = isAltSort(option)
                          const currentDirLabel = alt ? option.altDirLabel : option.dirLabel

                          return (
                            <button
                              key={option.value}
                              onClick={() => handleSortClick(option)}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                                active
                                  ? 'bg-wine-50 dark:bg-wine-900/30 text-wine-600 dark:text-wine-400 font-medium'
                                  : 'text-cellar-700 dark:text-gray-300 hover:bg-cellar-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <span>{option.label}</span>
                              {active && (
                                <span className="flex items-center gap-1 text-xs opacity-75">
                                  <span>{currentDirLabel}</span>
                                  {option.altValue != null && (
                                    <svg className={`w-3 h-3 transition-transform ${alt ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  )}
                                </span>
                              )}
                            </button>
                          )
                        })}
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
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Bottle</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Vineyard</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Rating</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Review</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Notes</th>
                  <th className="text-left py-3 px-2 font-medium text-cellar-700 dark:text-gray-300">Date Tried</th>
                  {isOwnProfile && <th className="py-3 px-2 w-0"></th>}
                </tr>
              </thead>
              <tbody>
                {sortedWines.map((userWine, index) => {
                  const userRating = 'userReview' in userWine && userWine.userReview 
                    ? userWine.userReview.rating 
                    : ratingStates[userWine.wine.id] || 0
                  
                  return (
                    <tr key={userWine.id} className="border-b border-cellar-100 dark:border-gray-700 hover:bg-cellar-50 dark:hover:bg-gray-800/50">
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
                            onRatingChange={(rating) => {
                              setRatingStates(prev => ({ ...prev, [userWine.wine.id]: rating }))
                              setPendingChanges(prev => ({
                                ...prev,
                                [userWine.id]: { ...prev[userWine.id], rating }
                              }))
                            }}
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
                      
                      {/* Notes */}
                      <td className="py-4 px-2">
                        {(() => {
                          const wineNotes = userWine.notes
                            || localUserWines.find(uw => uw.wine.id === userWine.wine.id && uw.id !== userWine.id && uw.notes)?.notes
                          return wineNotes ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                if (notesModalWineId === userWine.id) {
                                  setNotesModalWineId(null)
                                  setNotesPopoverPos(null)
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setNotesPopoverPos({ top: rect.bottom + 6, left: rect.left })
                                  setNotesModalWineId(userWine.id)
                                  setEditingNotesText(wineNotes)
                                  setOriginalNotesText(wineNotes)
                                }
                              }}
                              className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-sm font-medium cursor-pointer"
                            >
                              Notes
                            </button>
                          ) : (
                            <span className="text-cellar-400 dark:text-gray-500 text-sm">—</span>
                          )
                        })()}
                      </td>

                      {/* Date Tried */}
                      <td className="py-4 px-2">
                        <div className="flex items-center justify-between gap-2">
                          {editingDateId === userWine.id ? (
                            <input
                              type="date"
                              autoFocus
                              defaultValue={
                                pendingChanges[userWine.id]?.date
                                  || (userWine.addedAt
                                    ? new Date(userWine.addedAt).toISOString().slice(0, 10)
                                    : '')
                              }
                              onChange={(e) => {
                                if (!e.target.value) return
                                setPendingChanges(prev => ({
                                  ...prev,
                                  [userWine.id]: { ...prev[userWine.id], date: e.target.value }
                                }))
                              }}
                              onKeyDown={(e) => { if (e.key === 'Escape') setEditingDateId(null) }}
                              className="text-sm border border-cellar-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-cellar-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-wine-500"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => isOwnProfile && setEditingDateId(userWine.id)}
                              className={`text-cellar-700 dark:text-gray-300 text-sm ${isOwnProfile ? 'hover:text-wine-600 dark:hover:text-wine-400 hover:underline cursor-pointer' : ''}`}
                              title={isOwnProfile ? 'Click to edit date' : undefined}
                            >
                              {(() => {
                                const pendingDate = pendingChanges[userWine.id]?.date
                                if (pendingDate) {
                                  return new Date(pendingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                }
                                return userWine.addedAt
                                  ? new Date(userWine.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : '—'
                              })()}
                            </button>
                          )}
                          {isOwnProfile && (
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
                          )}
                        </div>
                      </td>
                      {isOwnProfile && (
                        <td className="py-4 px-2 whitespace-nowrap">
                          {pendingChanges[userWine.id] && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => savePending(userWine)}
                                className="px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelPending(userWine)}
                                className="px-2 py-1 text-xs font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      )}
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
                  addedAt={userWine.addedAt}
                  alignRatingBottom={activeTab === 'MY_CELLAR' && isOwnProfile}
                />
                
                {/* Collection Badge */}
                <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium text-white shadow-lg pointer-events-none">
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
                        disabled={addingToTriedWineId !== null}
                        className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingToTriedWineId === userWine.wine.id ? 'Moving...' : '✅ Add to Tried'}
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

      {/* Notes popover */}
      {notesModalWineId && notesPopoverPos && (() => {
        const wine = localUserWines.find(uw => uw.id === notesModalWineId)
        if (!wine) return null
        const sourceEntry = wine.notes
          ? wine
          : localUserWines.find(uw => uw.wine.id === wine.wine.id && uw.id !== wine.id && uw.notes)
        if (!sourceEntry) return null

        const hasChanges = editingNotesText !== originalNotesText
        const closePopover = () => { setNotesModalWineId(null); setNotesPopoverPos(null) }

        const handleSave = async () => {
          setSavingNotes(true)
          const wineId = wine.wine.id
          const entryToUpdate = localUserWines.find(uw => uw.wine.id === wineId && uw.inCellar) || sourceEntry
          try {
            const response = await fetch('/api/user-wines', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wineId, notes: editingNotesText.trim() || null }),
            })
            if (response.ok) {
              setLocalUserWines(prev => prev.map(uw =>
                uw.wine.id === wineId ? { ...uw, notes: editingNotesText.trim() || null } : uw
              ))
              setOriginalNotesText(editingNotesText)
            }
          } catch (error) {
            console.error('Failed to save notes:', error)
          } finally {
            setSavingNotes(false)
          }
        }

        const handleCancel = () => {
          setEditingNotesText(originalNotesText)
        }

        const clampedLeft = Math.min(notesPopoverPos.left, window.innerWidth - 272)
        const fitsBelow = notesPopoverPos.top + 200 < window.innerHeight
        const topPos = fitsBelow ? notesPopoverPos.top : notesPopoverPos.top - 212

        return (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                if (hasChanges) return
                closePopover()
              }}
            />
            <div
              className="fixed z-50 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-cellar-200 dark:border-gray-600 p-3"
              style={{ top: topPos, left: Math.max(8, clampedLeft) }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-cellar-800 dark:text-gray-200">
                  Notes
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (hasChanges) {
                      handleCancel()
                    }
                    closePopover()
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm leading-none cursor-pointer shrink-0"
                >
                  ×
                </button>
              </div>
              <textarea
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto'
                    el.style.height = el.scrollHeight + 'px'
                  }
                }}
                value={editingNotesText}
                onChange={(e) => {
                  setEditingNotesText(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                className="w-full text-sm text-cellar-700 dark:text-gray-300 bg-cellar-50 dark:bg-gray-700 border border-cellar-200 dark:border-gray-600 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-teal-500 overflow-hidden"
              />
              {hasChanges && (
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={savingNotes}
                    className="px-2.5 py-1 text-xs font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={savingNotes}
                    className="px-2.5 py-1 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}
