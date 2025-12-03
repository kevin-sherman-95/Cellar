'use client'

import { useState } from 'react'

interface StarRatingProps {
  rating: number
  onRatingChange?: (rating: number) => void
  interactive?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showValue?: boolean
  spacing?: 'default' | 'wide'
}

export default function StarRating({ 
  rating, 
  onRatingChange, 
  interactive = false, 
  size = 'md',
  showValue = false,
  spacing = 'default'
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)
  const [isClicking, setIsClicking] = useState(false)


  const sizes = {
    xs: 'text-2xl',
    sm: 'text-3xl',
    md: 'text-4xl',
    lg: 'text-5xl'
  }

  const handleClick = (newRating: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (interactive && onRatingChange) {
      setIsClicking(true)
      // Ensure rating is in proper half-star increments
      const roundedRating = Math.round(newRating * 2) / 2
      onRatingChange(roundedRating)
      // Reset clicking state after a brief moment
      setTimeout(() => setIsClicking(false), 150)
    }
  }

  const handleMouseEnter = (newRating: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (interactive && !isClicking) {
      const roundedRating = Math.round(newRating * 2) / 2
      setHoverRating(roundedRating)
    }
  }

  const handleMouseLeave = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (interactive && !isClicking) {
      setHoverRating(0)
    }
  }

  // Use hoverRating when mouse is hovering and not clicking, otherwise use the actual rating
  const displayRating = (hoverRating > 0 && !isClicking) ? hoverRating : rating

  // Calculate star widths for button positioning
  const starWidth = size === 'xs' ? 28 : size === 'sm' ? 72 : size === 'md' ? 80 : 100
  const overlap = size === 'xs' ? 8 : 40
  const visibleWidth = starWidth - overlap

  // Helper to compute rating from mouse position across full star row (used for wide spacing)
  const getRatingFromPosition = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    if (rect.width === 0) return rating || 0

    const x = e.clientX - rect.left
    const ratio = Math.min(Math.max(x / rect.width, 0), 1)
    const stars = ratio * 5

    // Round to nearest half-star with smoothing at the extremes
    let rounded = Math.round(stars * 2) / 2

    // If we're very close to 5, snap to 5 to avoid jitter near the far right edge
    if (rounded > 4.75) {
      rounded = 5
    }
    // If we're very close to 0, snap to 0.5 so first hover is stable
    if (rounded < 0.75) {
      rounded = 0.5
    }

    // Clamp between 0.5 and 5
    return Math.min(5, Math.max(0.5, rounded))
  }

  return (
    <div className="flex items-center">
      <div 
        className={`flex ${sizes[size]} ${interactive ? 'cursor-pointer' : ''} items-center relative overflow-hidden`}
        onMouseLeave={interactive ? () => handleMouseLeave() : undefined}
      >
        {/* Interactive layer - separate behavior for wide vs default spacing */}
        {interactive && spacing === 'wide' && (
          <div
            className="absolute inset-0"
            style={{ zIndex: 100 }}
            onClick={(e) => {
              const newRating = getRatingFromPosition(e)
              handleClick(newRating, e)
            }}
            onMouseMove={(e) => {
              if (interactive && !isClicking) {
                const newRating = getRatingFromPosition(e)
                setHoverRating(newRating)
              }
            }}
          />
        )}
        {interactive && spacing !== 'wide' && (
          <div className="absolute inset-0" style={{ zIndex: 100 }}>
            {Array(5).fill(0).map((_, i) => {
              const starNumber = i + 1
              const halfStarNumber = i + 0.5

              // Default: overlapping stars with half-star precision
              // Calculate absolute positions for VISIBLE portions only
              // Star 1: visible 0-80px (full star)
              // Star 2: visible 80-120px (only the 40px not behind star 1)
              // Star 3: visible 120-160px
              // Star 4: visible 160-200px
              // Star 5: visible 200-240px
              
              // Shift adjustment to move buttons slightly left
              const shiftLeft = size === 'xs' ? 2 : 10
              
              const visibleStart = i * visibleWidth + (i === 0 ? 0 : starWidth - visibleWidth) - shiftLeft
              const visibleWidth_actual = i === 0 ? starWidth : visibleWidth
              const visibleEnd = visibleStart + visibleWidth_actual
              
              // For first star, make right button slightly smaller by adjusting split point
              const adjustFirstStar = i === 0 ? 5 : 0
              
              const leftButtonEnd = visibleStart + visibleWidth_actual / 2 + adjustFirstStar
              
              const leftButtonStart = visibleStart
              const leftButtonWidth = leftButtonEnd - leftButtonStart
              
              const rightButtonStart = leftButtonEnd
              const rightButtonWidth = visibleEnd - rightButtonStart

              return (
                <div key={i}>
                  {/* Left half button */}
                  <button
                    type="button"
                    className="absolute top-0"
                    style={{ 
                      left: `${leftButtonStart}px`,
                      width: `${leftButtonWidth}px`,
                      height: '100%',
                      pointerEvents: 'auto',
                      background: 'transparent'
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleClick(halfStarNumber, e)
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation()
                      handleMouseEnter(halfStarNumber, e)
                    }}
                    aria-label={`Rate ${halfStarNumber} stars`}
                  />
                  {/* Right half button */}
                  <button
                    type="button"
                    className="absolute top-0"
                    style={{ 
                      left: `${rightButtonStart}px`,
                      width: `${rightButtonWidth}px`,
                      height: '100%',
                      pointerEvents: 'auto',
                      background: 'transparent'
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleClick(starNumber, e)
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation()
                      handleMouseEnter(starNumber, e)
                    }}
                    aria-label={`Rate ${starNumber} stars`}
                  />
                </div>
              )
            })}
          </div>
        )}
        
        {/* Stars visual layer */}
        {Array(5).fill(0).map((_, i) => {
          const starNumber = i + 1
          const halfStarNumber = i + 0.5
          
          // Determine star state based on current display rating
          const isFullyFilled = displayRating >= starNumber
          const isHalfFilled = displayRating >= halfStarNumber && displayRating < starNumber && !isFullyFilled
          
          return (
            <div 
              key={i} 
              className={`relative inline-flex items-center justify-center ${
                size === 'xs' ? 'w-7 h-7' :
                size === 'sm' ? 'w-[4.5rem] h-[4.5rem]' : 
                size === 'md' ? 'w-20 h-20' : 
                'w-[6.25rem] h-[6.25rem]'
              }`}
              style={{ 
                marginLeft: i > 0 
                  ? (spacing === 'wide'
                      ? '0px'
                      : (size === 'xs' ? '-8px' : '-40px'))
                  : '0',
                position: 'relative',
                zIndex: 5 - i // Higher z-index for earlier stars
              }}
            >
              
              {/* Star visual - fixed position to prevent shaking */}
              <span className={`${interactive ? 'pointer-events-none' : ''} relative inline-block leading-none`} style={{ zIndex: 5 - i }}>
                {isFullyFilled ? (
                  <span className="text-orange-400 flex items-center justify-center w-full h-full">★</span>
                ) : isHalfFilled ? (
                  <span 
                    className="relative inline-block"
                    style={{
                      background: 'linear-gradient(90deg, rgb(251 146 60) 50%, rgb(209 213 219) 50%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent'
                    }}
                  >
                    ★
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600 flex items-center justify-center w-full h-full">☆</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
      
      {showValue && (
        <span className="text-cellar-600 font-medium">
          {displayRating > 0 ? displayRating.toFixed(1) : '0.0'}
        </span>
      )}
      
      {/* Only show separate hover value when not already showing the main value */}
      {interactive && hoverRating > 0 && !showValue && (
        <span className="text-cellar-500 text-sm">
          ({hoverRating.toFixed(1)})
        </span>
      )}
    </div>
  )
}
