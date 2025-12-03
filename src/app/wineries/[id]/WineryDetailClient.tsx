/**
 * Winery Detail Client Component
 * Client-side winery detail view with wines
 * Copyright Anysphere Inc.
 */

'use client';

import Link from 'next/link';
import WineCard from '@/components/wine/WineCard';

interface Wine {
  id: string;
  name: string;
  vineyard: string;
  region: string;
  country: string;
  varietal: string;
  vintage: number | null;
  description: string | null;
  image: string | null;
  averageRating?: number;
  _count: {
    reviews: number;
  };
}

interface Winery {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string;
  country: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  image: string | null;
  wines: Wine[];
  _count: {
    wines: number;
  };
  isVirtual?: boolean; // True if this is a virtual winery based on wine vineyard names
}

interface WineryDetailClientProps {
  winery: Winery;
}

export default function WineryDetailClient({ winery }: WineryDetailClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-wine-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back button */}
        <Link
          href="/wineries"
          className="inline-flex items-center text-wine-600 dark:text-wine-400 hover:text-wine-700 dark:hover:text-wine-300 mb-6"
        >
          <span className="mr-2">←</span>
          Back to Wineries
        </Link>

        {/* Winery header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Image */}
            <div className="lg:col-span-1">
              <div className="aspect-square bg-gradient-to-br from-wine-100 to-wine-200 dark:from-wine-900 dark:to-wine-800 rounded-lg flex items-center justify-center overflow-hidden">
                {winery.image ? (
                  <img
                    src={winery.image}
                    alt={winery.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-9xl">🏛️</span>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="lg:col-span-2">
              <h1 className="text-4xl font-serif font-bold text-cellar-900 dark:text-gray-100 mb-4">
                {winery.name}
              </h1>

              {winery.isVirtual && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-4 py-3 mb-4">
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    ℹ️ This page is based on wine records. Full winery details coming soon!
                  </p>
                </div>
              )}

              {winery.description && (
                <p className="text-cellar-600 dark:text-gray-300 mb-6">
                  {winery.description}
                </p>
              )}

              <div className="space-y-3">
                {/* Location */}
                <div className="flex items-start">
                  <span className="text-2xl mr-3">📍</span>
                  <div>
                    {winery.city && (
                      <p className="font-semibold text-cellar-800 dark:text-gray-200">
                        {winery.city}
                      </p>
                    )}
                    {winery.address && (
                      <p className="text-cellar-600 dark:text-gray-400 text-sm">
                        {winery.address}
                      </p>
                    )}
                    <p className={`text-cellar-500 dark:text-gray-500 ${winery.city ? 'text-sm' : 'font-semibold text-cellar-800 dark:text-gray-200'}`}>
                      {winery.region}, {winery.country}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                {winery.phone && (
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📞</span>
                    <a
                      href={`tel:${winery.phone}`}
                      className="text-wine-600 dark:text-wine-400 hover:underline"
                    >
                      {winery.phone}
                    </a>
                  </div>
                )}

                {/* Website */}
                {winery.website && (
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🌐</span>
                    <a
                      href={winery.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-wine-600 dark:text-wine-400 hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}

                {/* Wine count */}
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🍷</span>
                  <p className="text-cellar-700 dark:text-gray-300">
                    <span className="font-semibold">{winery._count.wines}</span>{' '}
                    {winery._count.wines === 1 ? 'wine' : 'wines'} in our catalog
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-4 mt-8">
                {winery.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${winery.name}, ${winery.address}, ${winery.city}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-wine-600 hover:bg-wine-700 dark:bg-wine-700 dark:hover:bg-wine-600 text-white rounded-md font-medium transition-colors"
                  >
                    <span className="mr-2">🗺️</span>
                    Get Directions
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wines section */}
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-cellar-900 dark:text-gray-100 mb-6">
            Wines from {winery.name}
          </h2>

          {winery.wines.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {winery.wines.map((wine) => (
                  <WineCard key={wine.id} wine={wine as any} showAddToCollection={false} />
                ))}
              </div>

              {winery._count.wines > winery.wines.length && (
                <div className="text-center mt-8">
                  <p className="text-cellar-600 dark:text-gray-400">
                    Showing {winery.wines.length} of {winery._count.wines} wines
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <span className="text-6xl mb-4 block">🍾</span>
              <h3 className="text-xl font-semibold text-cellar-800 dark:text-gray-200 mb-2">
                No wines yet
              </h3>
              <p className="text-cellar-600 dark:text-gray-400">
                We haven&apos;t added any wines from this winery to our catalog yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


