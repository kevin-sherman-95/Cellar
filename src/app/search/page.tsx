'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Redirect to /wines with the search query preserved
    const query = searchParams.get('q')
    const redirectUrl = query ? `/wines?q=${encodeURIComponent(query)}` : '/wines'
    router.replace(redirectUrl)
  }, [searchParams, router])

  // Show loading state while redirecting
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center py-16">
        <div className="text-4xl mb-4">🔄</div>
        <h3 className="text-xl font-serif font-semibold text-cellar-800 mb-2">
          Redirecting to Browse Wines...
        </h3>
        <p className="text-cellar-600">
          You&apos;re being redirected to our combined browse and search page.
        </p>
      </div>
    </div>
  )
}
