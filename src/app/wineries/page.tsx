/**
 * Wineries List Page
 * Displays all Napa Valley wineries with search and filter
 * Copyright Anysphere Inc.
 */

import WineriesClient from './WineriesClient';

export const metadata = {
  title: 'Browse Wineries | Cellar',
  description: 'Explore wineries and discover exceptional wines',
};

export default function WineriesPage() {
  return <WineriesClient />;
}
