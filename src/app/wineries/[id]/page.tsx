/**
 * Individual Winery Page
 * Displays detailed information about a specific winery
 * Copyright Anysphere Inc.
 */

import { notFound } from 'next/navigation';
import WineryDetailClient from './WineryDetailClient';

async function getWinery(idOrName: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    // The id could be URL-encoded winery name, pass it as-is since the API handles decoding
    const res = await fetch(`${baseUrl}/api/wineries/${encodeURIComponent(idOrName)}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching winery:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const winery = await getWinery(params.id);

  if (!winery) {
    return {
      title: 'Winery Not Found | Cellar',
    };
  }

  return {
    title: `${winery.name} | Cellar`,
    description: `Discover wines from ${winery.name} in ${winery.city || winery.region}`,
  };
}

export default async function WineryPage({ params }: { params: { id: string } }) {
  const winery = await getWinery(params.id);

  if (!winery) {
    notFound();
  }

  return <WineryDetailClient winery={winery} />;
}


