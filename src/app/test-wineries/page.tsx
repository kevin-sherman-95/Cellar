'use client';

import { useEffect, useState } from 'react';

export default function TestWineriesPage() {
  const [status, setStatus] = useState('Loading...');
  const [wineries, setWineries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test 1: Fetch all wineries
    fetch('/api/wineries?limit=5')
      .then(res => {
        console.log('Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('API Response:', data);
        setWineries(data.wineries || []);
        setStatus(`Found ${data.pagination?.total || 0} total wineries`);
      })
      .catch(err => {
        console.error('API Error:', err);
        setError(err.message);
        setStatus('Error loading wineries');
      });
  }, []);

  return (
    <div className="min-h-screen p-8 bg-white">
      <h1 className="text-3xl font-bold mb-4">Winery API Test</h1>
      
      <div className="mb-4">
        <strong>Status:</strong> {status}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mb-4">
        <strong>Sample Wineries:</strong>
      </div>

      {wineries.length > 0 ? (
        <ul className="list-disc pl-6">
          {wineries.map((winery, i) => (
            <li key={i}>
              {winery.name} - {winery.city || 'No city'}, {winery.region}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No wineries loaded yet...</p>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <p className="text-sm">
          Open browser console (F12) to see detailed logs
        </p>
      </div>
    </div>
  );
}




