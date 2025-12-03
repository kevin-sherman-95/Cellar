'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import ActivityFeed from '@/components/social/ActivityFeed'

export default function ActivityPage() {
  const { data: session, status } = useSession()
  const [feedType, setFeedType] = useState<'all' | 'following'>('all')

  if (status === 'loading') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-cellar-200 rounded mb-6 w-1/3"></div>
          <div className="h-12 bg-cellar-200 rounded mb-6"></div>
          <div className="space-y-6">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-cellar-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold text-cellar-900 mb-4">
          Wine Activity Feed
        </h1>
        <p className="text-lg text-cellar-600">
          Stay up to date with the latest wine discoveries and reviews from the community
        </p>
      </div>

      {/* Feed Type Toggle */}
      {session?.user && (
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <button
                onClick={() => setFeedType('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  feedType === 'all'
                    ? 'bg-wine-100 text-wine-700'
                    : 'text-cellar-600 hover:text-cellar-800 hover:bg-cellar-50'
                }`}
              >
                🌍 All Activity
              </button>
              <button
                onClick={() => setFeedType('following')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  feedType === 'following'
                    ? 'bg-wine-100 text-wine-700'
                    : 'text-cellar-600 hover:text-cellar-800 hover:bg-cellar-50'
                }`}
              >
                👥 Following
              </button>
            </div>

            <div className="flex items-center space-x-4 text-sm text-cellar-600">
              <span>Real-time updates</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome message for new users */}
      {!session?.user && (
        <div className="bg-wine-50 border border-wine-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="text-3xl">👋</div>
            <div>
              <h3 className="text-lg font-serif font-semibold text-wine-800 mb-2">
                Welcome to Cellar!
              </h3>
              <p className="text-wine-700 mb-4">
                Join our community of wine enthusiasts to share reviews, discover new wines, and connect with fellow wine lovers.
              </p>
              <div className="flex space-x-3">
                <a
                  href="/auth/signup"
                  className="wine-gradient text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Join Community
                </a>
                <a
                  href="/wines"
                  className="border border-wine-600 text-wine-600 hover:bg-wine-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Browse Wines
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <ActivityFeed 
        userId={session?.user?.id}
        followingOnly={feedType === 'following'}
      />

      {/* Sidebar with suggestions (for larger screens) */}
      <div className="hidden lg:block fixed right-4 top-1/2 transform -translate-y-1/2 w-80">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* Trending Wines */}
          <div>
            <h3 className="text-lg font-serif font-semibold text-cellar-800 mb-4">
              🔥 Trending Wines
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Château Margaux 2015', reviews: 24 },
                { name: 'Dom Pérignon 2012', reviews: 18 },
                { name: 'Opus One 2018', reviews: 15 }
              ].map((wine, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-cellar-800 text-sm">{wine.name}</p>
                    <p className="text-xs text-cellar-500">{wine.reviews} recent reviews</p>
                  </div>
                  <div className="text-lg">🍷</div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Users */}
          <div>
            <h3 className="text-lg font-serif font-semibold text-cellar-800 mb-4">
              👥 Wine Enthusiasts to Follow
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Sarah Johnson', specialty: 'Bordeaux Expert' },
                { name: 'Michael Chen', specialty: 'Natural Wines' },
                { name: 'Emma Wilson', specialty: 'Italian Wines' }
              ].map((user, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-wine-100 rounded-full flex items-center justify-center">
                    <span className="text-wine-600 font-medium text-sm">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-cellar-800 text-sm">{user.name}</p>
                    <p className="text-xs text-cellar-500">{user.specialty}</p>
                  </div>
                  <button className="text-xs bg-wine-100 text-wine-700 hover:bg-wine-200 px-2 py-1 rounded transition-colors">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
