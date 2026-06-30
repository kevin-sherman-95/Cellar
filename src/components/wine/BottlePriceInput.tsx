'use client'

import { useEffect, useState } from 'react'

interface BottlePriceInputProps {
  userWineId: string
  priceInCents: number | null
  onSaved: (priceInCents: number | null) => void
}

function formatPrice(priceInCents: number | null) {
  return priceInCents === null ? '' : (priceInCents / 100).toFixed(2)
}

export default function BottlePriceInput({
  userWineId,
  priceInCents,
  onSaved,
}: BottlePriceInputProps) {
  const [value, setValue] = useState(formatPrice(priceInCents))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setValue(formatPrice(priceInCents))
  }, [priceInCents])

  const savePrice = async () => {
    const trimmedValue = value.trim()
    const price = trimmedValue === '' ? null : Number(trimmedValue)
    const currentValue = formatPrice(priceInCents)

    if (trimmedValue !== '' && (!Number.isFinite(price) || price! < 0)) {
      setError('Enter a valid price')
      return
    }

    if ((price === null ? '' : price.toFixed(2)) === currentValue) {
      setValue(currentValue)
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch('/api/user-wines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWineId, price }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save price')
      }

      onSaved(result.priceInCents)
      setValue(formatPrice(result.priceInCents))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save price')
      setValue(currentValue)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <label
        htmlFor={`bottle-price-${userWineId}`}
        className="mb-2 block text-sm font-medium text-cellar-700 dark:text-gray-300"
      >
        Bottle Price
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-cellar-500 dark:text-gray-400">
          $
        </span>
        <input
          id={`bottle-price-${userWineId}`}
          type="number"
          min="0"
          max="1000000"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={event => {
            setValue(event.target.value)
            setError('')
          }}
          onBlur={savePrice}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          placeholder="0.00"
          disabled={isSaving}
          className="w-full rounded-md border border-cellar-300 bg-white py-2 pl-7 pr-16 text-sm text-cellar-800 focus:border-wine-500 focus:outline-none focus:ring-2 focus:ring-wine-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:ring-wine-400"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-cellar-400 dark:text-gray-500">
          {isSaving ? 'Saving...' : 'USD'}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
