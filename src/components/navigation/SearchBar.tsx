'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  name: string
  vineyard: string
  vintage: number | null
  varietal: string
  region: string | null
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/wines/autocomplete?q=${encodeURIComponent(query.trim())}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.wines?.slice(0, 8) || [])
          setIsOpen(true)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/wines?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setIsOpen(false)
    }
  }

  const handleSelectWine = useCallback((wine: SearchResult) => {
    router.push(`/wines/${wine.id}`)
    setQuery('')
    setIsOpen(false)
    setHighlightedIndex(-1)
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelectWine(results[highlightedIndex])
        } else if (query.trim()) {
          router.push(`/wines?q=${encodeURIComponent(query.trim())}`)
          setQuery('')
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlightedIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          placeholder="Search wines..."
          className="w-72 lg:w-96 pl-9 pr-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-transparent transition-all"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-activedescendant={highlightedIndex >= 0 ? `search-result-${highlightedIndex}` : undefined}
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
          </div>
        )}
      </form>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto"
        >
          {results.map((wine, index) => (
            <li
              key={wine.id}
              id={`search-result-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              onClick={() => handleSelectWine(wine)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2.5 cursor-pointer transition-colors ${
                highlightedIndex === index
                  ? 'bg-amber-600/20 text-white'
                  : 'text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-600 to-red-700 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 14h-4v-1h4v1zm1.31-3.69c-.43.31-.81.59-1.06.91-.08.09-.15.18-.21.28H9.96c-.06-.1-.13-.19-.21-.28-.25-.32-.63-.6-1.06-.91C7.09 11.15 6 9.85 6 9c0-3.31 2.69-6 6-6s6 2.69 6 6c0 .85-1.09 2.15-2.69 3.31z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{wine.name}</p>
                  <p className="text-xs text-zinc-400 truncate">
                    {wine.vineyard}
                    {wine.vintage && ` · ${wine.vintage}`}
                    {wine.varietal && ` · ${wine.varietal}`}
                  </p>
                  {wine.region && (
                    <p className="text-xs text-zinc-500 truncate">{wine.region}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
          <li className="px-3 py-2 bg-zinc-800/50 border-t border-zinc-700">
            <button
              type="button"
              onClick={() => {
                router.push(`/wines?q=${encodeURIComponent(query.trim())}`)
                setQuery('')
                setIsOpen(false)
              }}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>See all results for &ldquo;{query}&rdquo;</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </li>
        </ul>
      )}

      {/* No Results Message */}
      {isOpen && query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4 z-50">
          <p className="text-sm text-zinc-400 text-center">No wines found for &ldquo;{query}&rdquo;</p>
          <button
            type="button"
            onClick={() => {
              router.push(`/wines?q=${encodeURIComponent(query.trim())}`)
              setQuery('')
              setIsOpen(false)
            }}
            className="mt-2 text-xs text-amber-400 hover:text-amber-300 mx-auto block"
          >
            Search all wines →
          </button>
        </div>
      )}
    </div>
  )
}
