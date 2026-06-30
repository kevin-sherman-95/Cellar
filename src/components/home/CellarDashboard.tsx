'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import WineCard from '@/components/wine/WineCard'
import type { CellarDashboardData } from '@/lib/actions'

const AddWineModal = dynamic(() => import('@/components/wine/AddWineModal'), {
  ssr: false,
})

type CellarDashboardProps = CellarDashboardData & {
  userName?: string | null
}

export default function CellarDashboard({
  stats,
  recentWines,
  userName,
}: CellarDashboardProps) {
  const router = useRouter()
  const [isAddWineOpen, setIsAddWineOpen] = useState(false)
  const firstName = userName?.trim().split(/\s+/)[0]

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-red-800 via-red-700 to-amber-600 px-4 py-12 text-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
            My Cellar
          </p>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="mb-3 font-serif text-4xl font-bold sm:text-5xl">
                {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
              </h1>
              <p className="max-w-2xl text-lg text-red-50">
                Your collection is ready. Add a bottle or pick up where you left off.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsAddWineOpen(true)}
                className="rounded-full bg-white px-7 py-3 font-bold text-red-700 shadow-lg transition hover:bg-amber-50"
              >
                + Add Wine
              </button>
              <Link
                href="/my-wines"
                prefetch
                className="rounded-full border-2 border-white px-7 py-3 text-center font-bold text-white transition hover:bg-white hover:text-red-700"
              >
                View Full Cellar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section aria-labelledby="collection-overview" className="mb-12">
          <h2 id="collection-overview" className="mb-5 font-serif text-2xl font-bold text-cellar-900 dark:text-gray-100">
            Collection Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/my-wines"
              className="rounded-2xl bg-white p-6 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800"
            >
              <p className="text-4xl font-bold text-purple-700 dark:text-purple-400">{stats.inCellar}</p>
              <p className="mt-1 font-medium text-cellar-600 dark:text-gray-300">
                {stats.inCellar === 1 ? 'Bottle in your cellar' : 'Bottles in your cellar'}
              </p>
            </Link>
            <Link
              href="/my-wines"
              className="rounded-2xl bg-white p-6 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800"
            >
              <p className="text-4xl font-bold text-green-700 dark:text-green-400">{stats.tried}</p>
              <p className="mt-1 font-medium text-cellar-600 dark:text-gray-300">
                {stats.tried === 1 ? 'Wine tried' : 'Wines tried'}
              </p>
            </Link>
          </div>
        </section>

        <section aria-labelledby="recent-wines">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id="recent-wines" className="font-serif text-2xl font-bold text-cellar-900 dark:text-gray-100">
              Recently Added
            </h2>
            {recentWines.length > 0 && (
              <Link href="/my-wines" className="font-semibold text-wine-700 hover:text-wine-800 dark:text-wine-400">
                See all
              </Link>
            )}
          </div>

          {recentWines.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentWines.map(userWine => (
                <WineCard
                  key={userWine.id}
                  wine={userWine.wine}
                  showAddToCollection={false}
                  quantity={userWine.quantity}
                  addedAt={userWine.addedAt}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-cellar-300 bg-white p-10 text-center shadow-sm dark:border-gray-600 dark:bg-gray-800">
              <div className="mb-4 text-5xl">🍷</div>
              <h3 className="mb-2 font-serif text-xl font-bold text-cellar-900 dark:text-gray-100">
                Your cellar is waiting for its first bottle
              </h3>
              <p className="mb-6 text-cellar-600 dark:text-gray-400">
                Add a wine now, or browse the catalog for inspiration.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsAddWineOpen(true)}
                  className="rounded-full wine-gradient px-6 py-3 font-bold text-white"
                >
                  Add Your First Wine
                </button>
                <Link
                  href="/wines"
                  className="rounded-full border border-wine-600 px-6 py-3 font-bold text-wine-700 dark:text-wine-400"
                >
                  Browse Wines
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      <AddWineModal
        isOpen={isAddWineOpen}
        onClose={() => setIsAddWineOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
