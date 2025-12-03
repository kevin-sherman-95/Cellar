/**
 * Wineries Client Component
 * Client-side interactive winery listing
 * Copyright Anysphere Inc.
 */

'use client';

import { useState, useEffect } from 'react';
import WineryCard from '@/components/winery/WineryCard';
import WineryFilters from '@/components/winery/WineryFilters';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function WineriesClient() {
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch cities on mount
  useEffect(() => {
    fetch('/api/wineries/cities')
      .then((res) => res.json())
      .then((data) => setCities(data.cities || []))
      .catch((error) => console.error('Error fetching cities:', error));
  }, []);

  // Fetch wineries when filters or page changes
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '20',
    });

    if (searchQuery) params.set('q', searchQuery);
    if (selectedCity) params.set('city', selectedCity);

    const url = `/api/wineries?${params}`;
    console.log('🔍 Fetching wineries:', url);

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        console.log('✅ Received wineries:', data.wineries?.length, 'results');
        setWineries(data.wineries || []);
        setPagination(data.pagination);
        setLoading(false);
      })
      .catch((error) => {
        console.error('❌ Error fetching wineries:', error);
        setLoading(false);
      });
  }, [searchQuery, selectedCity, currentPage]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-wine-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-cellar-900 dark:text-gray-100 mb-2">
            Browse Wineries 🍷
          </h1>
          <p className="text-cellar-600 dark:text-gray-400">
            Discover exceptional wineries in Napa Valley
          </p>
        </div>

        {/* Filters */}
        <WineryFilters
          onSearch={handleSearch}
          onCityChange={handleCityChange}
          cities={cities}
        />

        {/* Results count */}
        {pagination && !loading && (
          <div className="mb-6">
            <p className="text-cellar-600 dark:text-gray-400">
              Showing <span className="font-semibold">{wineries.length}</span> of{' '}
              <span className="font-semibold">{pagination.total}</span> wineries
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        )}

        {/* Wineries grid */}
        {!loading && wineries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {wineries.map((winery) => (
              <WineryCard key={winery.id} winery={winery} />
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && wineries.length === 0 && (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">🔍</span>
            <h3 className="text-xl font-semibold text-cellar-800 dark:text-gray-200 mb-2">
              No wineries found
            </h3>
            <p className="text-cellar-600 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 mt-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-wine-600 dark:border-wine-400 text-wine-600 dark:text-wine-400 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-wine-50 dark:hover:bg-wine-900/20 transition-colors"
            >
              Previous
            </button>
            <span className="text-cellar-600 dark:text-gray-400">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              className="px-4 py-2 border border-wine-600 dark:border-wine-400 text-wine-600 dark:text-wine-400 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-wine-50 dark:hover:bg-wine-900/20 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
