'use client'

import { useState, useEffect } from 'react'
import ReviewCard from '@/components/reviews/ReviewCard'
import { ActivityItem } from '@/lib/types'

interface ActivityFeedProps {
  userId?: string
  followingOnly?: boolean
}

export default function ActivityFeed({ userId, followingOnly = false }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'reviews' | 'follows' | 'wines'>('all')

  useEffect(() => {
    fetchActivities()
  }, [userId, followingOnly, filter])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      // TODO: Implement actual API call
      // Mock data for demonstration
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'review',
          user: {
            id: 'user1',
            name: 'Sarah Johnson',
            avatar: null
          },
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          data: {
            review: {
              id: 'rev1',
              rating: 4.5,
              notes: 'Exceptional Bordeaux with complex tannins and beautiful finish. Notes of blackcurrant and cedar.',
              wine: {
                id: 'wine1',
                name: 'Château Margaux 2015',
                vineyard: 'Château Margaux',
                vintage: 2015
              },
              _count: { likes: 12, comments: 3 }
            }
          }
        },
        {
          id: '2',
          type: 'follow',
          user: {
            id: 'user2',
            name: 'Michael Chen',
            avatar: null
          },
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          data: {
            followedUser: {
              id: 'user3',
              name: 'Emma Wilson',
              avatar: null
            }
          }
        },
        {
          id: '3',
          type: 'wine_added',
          user: {
            id: 'user3',
            name: 'Emma Wilson',
            avatar: null
          },
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          data: {
            wine: {
              id: 'wine2',
              name: 'Dom Pérignon 2012',
              vineyard: 'Moët & Chandon',
              status: 'WANT_TO_TRY'
            }
          }
        }
      ]

      // Filter activities based on selected filter
      let filteredActivities = mockActivities
      if (filter !== 'all') {
        filteredActivities = mockActivities.filter(activity => {
          switch (filter) {
            case 'reviews':
              return activity.type === 'review'
            case 'follows':
              return activity.type === 'follow'
            case 'wines':
              return activity.type === 'wine_added'
            default:
              return true
          }
        })
      }

      setActivities(filteredActivities)
    } catch (error) {
      console.error('Error fetching activities:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 24 * 60) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / (24 * 60))}d ago`
    }
  }

  const renderActivity = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'review':
        return (
          <ReviewCard 
            key={activity.id}
            review={activity.data.review}
            showWineInfo={true}
          />
        )

      case 'follow':
        return (
          <div key={activity.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-wine-100 rounded-full flex items-center justify-center">
                {activity.user.avatar ? (
                  <img 
                    src={activity.user.avatar} 
                    alt={activity.user.name || 'User'} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-wine-600 font-semibold">
                    {activity.user.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              
              <div className="flex-1">
                <p className="text-cellar-800">
                  <span className="font-semibold">{activity.user.name}</span>
                  {' started following '}
                  <span className="font-semibold">{activity.data.followedUser.name}</span>
                </p>
                <p className="text-sm text-cellar-500">
                  {formatTimeAgo(activity.createdAt)}
                </p>
              </div>

              <div className="text-2xl">👥</div>
            </div>
          </div>
        )

      case 'wine_added':
        return (
          <div key={activity.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-wine-100 rounded-full flex items-center justify-center">
                {activity.user.avatar ? (
                  <img 
                    src={activity.user.avatar} 
                    alt={activity.user.name || 'User'} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-wine-600 font-semibold">
                    {activity.user.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              
              <div className="flex-1">
                <p className="text-cellar-800">
                  <span className="font-semibold">{activity.user.name}</span>
                  {' added '}
                  <span className="font-semibold">{activity.data.wine.name}</span>
                  {' to their '}
                  <span className="text-wine-600">
                    {activity.data.wine.status === 'WANT_TO_TRY' ? 'wishlist' : 
                     activity.data.wine.status === 'TRIED' ? 'tried list' : 
                     'currently tasting'}
                  </span>
                </p>
                <p className="text-sm text-cellar-500">
                  {formatTimeAgo(activity.createdAt)}
                </p>
              </div>

              <div className="text-2xl">
                {activity.data.wine.status === 'WANT_TO_TRY' ? '⭐' : 
                 activity.data.wine.status === 'TRIED' ? '✅' : '🍷'}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div className="flex space-x-1">
          {[
            { key: 'all', label: 'All Activity', icon: '📱' },
            { key: 'reviews', label: 'Reviews', icon: '⭐' },
            { key: 'follows', label: 'Follows', icon: '👥' },
            { key: 'wines', label: 'Wine Lists', icon: '🍷' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-wine-100 text-wine-700'
                  : 'text-cellar-600 hover:text-cellar-800 hover:bg-cellar-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-6">
        {loading ? (
          // Loading skeleton
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-cellar-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-cellar-200 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-cellar-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-lg">
            <div className="text-4xl mb-4">🤷‍♀️</div>
            <h3 className="text-lg font-serif font-semibold text-cellar-800 mb-2">
              No activity yet
            </h3>
            <p className="text-cellar-600">
              {followingOnly 
                ? "Follow some wine enthusiasts to see their activity here"
                : "Be the first to share your wine experiences"
              }
            </p>
          </div>
        ) : (
          activities.map(renderActivity)
        )}
      </div>

      {/* Load More */}
      {activities.length > 0 && (
        <div className="text-center mt-8">
          <button className="border border-cellar-300 text-cellar-700 hover:bg-cellar-50 px-6 py-3 rounded-md font-medium transition-colors">
            Load More Activity
          </button>
        </div>
      )}
    </div>
  )
}
