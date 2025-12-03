/**
 * WineryFilters Component
 * Search and filter controls for wineries
 * Copyright Anysphere Inc.
 */

'use client';

import { useState, useEffect } from 'react';

interface WineryFiltersProps {
  onSearch: (query: string) => void;
  onCityChange: (city: string) => void;
  cities: string[];
}

export default function WineryFilters({ onSearch, onCityChange, cities }: WineryFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCity(value);
    onCityChange(value);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedCity('');
    onSearch('');
    onCityChange('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-serif font-semibold text-cellar-800 dark:text-gray-200 mb-4">
        Find Wineries
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search input */}
        <div className="md:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-cellar-700 dark:text-gray-300 mb-2">
            Search by name or location
          </label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="e.g., Caymus, Opus One, Oakville..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-wine-500 focus:border-transparent bg-white dark:bg-gray-700 text-cellar-900 dark:text-gray-100"
          />
        </div>

        {/* City filter */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-cellar-700 dark:text-gray-300 mb-2">
            Filter by city
          </label>
          <select
            id="city"
            value={selectedCity}
            onChange={handleCityChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-wine-500 focus:border-transparent bg-white dark:bg-gray-700 text-cellar-900 dark:text-gray-100"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear filters button */}
      {(searchQuery || selectedCity) && (
        <div className="mt-4">
          <button
            onClick={handleClear}
            className="text-wine-600 dark:text-wine-400 hover:text-wine-700 dark:hover:text-wine-300 text-sm font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}




