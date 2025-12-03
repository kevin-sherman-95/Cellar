/**
 * WineryCard Component
 * Displays individual winery information in a card format
 * Copyright Anysphere Inc.
 */

import Link from 'next/link';

interface Winery {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string;
  phone: string | null;
  image: string | null;
  _count?: {
    wines: number;
  };
}

interface WineryCardProps {
  winery: Winery;
}

export default function WineryCard({ winery }: WineryCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
      <Link href={`/wineries/${winery.id}`}>
        <div className="relative">
          <div className="h-48 bg-gradient-to-br from-wine-100 to-wine-200 dark:from-wine-900 dark:to-wine-800 flex items-center justify-center">
            {winery.image ? (
              <img 
                src={winery.image} 
                alt={winery.name}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <span className="text-6xl">🏛️</span>
            )}
          </div>
        </div>
      </Link>
      
      <div className="p-6 flex flex-col flex-grow">
        <Link href={`/wineries/${winery.id}`}>
          <h3 className="font-serif text-xl font-semibold text-cellar-800 dark:text-gray-200 mb-2 hover:text-wine-700 dark:hover:text-wine-400 transition-colors line-clamp-2">
            {winery.name}
          </h3>
        </Link>
        
        <div className="space-y-1 mb-4">
          {winery.city && (
            <p className="text-cellar-600 dark:text-gray-300 font-medium flex items-center">
              <span className="mr-2">📍</span>
              {winery.city}
            </p>
          )}
          {winery.address && (
            <p className="text-cellar-500 dark:text-gray-400 text-sm">
              {winery.address}
            </p>
          )}
          {winery.phone && (
            <p className="text-cellar-500 dark:text-gray-400 text-sm flex items-center">
              <span className="mr-2">📞</span>
              {winery.phone}
            </p>
          )}
        </div>
        
        {/* Spacer to push content below to bottom */}
        <div className="flex-grow"></div>
        
        {/* Wine count */}
        {winery._count && (
          <div className="flex items-center justify-between mb-4 p-3 bg-wine-50 dark:bg-wine-900/20 rounded-md">
            <span className="text-cellar-600 dark:text-gray-300 text-sm font-medium">
              Wines in catalog
            </span>
            <span className="text-wine-600 dark:text-wine-400 font-bold">
              {winery._count.wines}
            </span>
          </div>
        )}
        
        {/* Action button */}
        <Link href={`/wineries/${winery.id}`}>
          <button className="w-full bg-wine-600 hover:bg-wine-700 dark:bg-wine-700 dark:hover:bg-wine-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            View Winery Details
          </button>
        </Link>
      </div>
    </div>
  );
}


