'use client'

import { useState } from 'react'
import FollowButton from '@/components/social/FollowButton'
import WineCollectionTabs from '@/components/profile/WineCollectionTabs'
import ActivityFeed from '@/components/social/ActivityFeed'

interface UserProfileClientProps {
  user: any
  isOwnProfile: boolean
  currentUserId?: string
}

export default function UserProfileClient({ 
  user, 
  isOwnProfile, 
  currentUserId 
}: UserProfileClientProps) {
  const [activeTab, setActiveTab] = useState<'wines' | 'reviews' | 'activity'>('wines')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-wine-100 rounded-full flex items-center justify-center flex-shrink-0">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-wine-600">
                  {user.name?.charAt(0) || 'U'}
                </span>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold text-cellar-900 mb-2">
                {user.name}
              </h1>
              
              {user.location && (
                <p className="text-cellar-600 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {user.location}
                </p>
              )}

              {user.bio && (
                <p className="text-cellar-700 mb-4">{user.bio}</p>
              )}

              <p className="text-cellar-500 text-sm">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 md:mt-0 flex flex-col space-y-2">
            {isOwnProfile ? (
              <>
                <a
                  href="/settings"
                  className="wine-gradient text-white px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity text-center"
                >
                  Edit Profile
                </a>
                <a
                  href="/my-wines"
                  className="border border-cellar-300 text-cellar-700 hover:bg-cellar-50 px-6 py-2 rounded-md font-medium transition-colors text-center"
                >
                  Manage Wines
                </a>
              </>
            ) : (
              <>
                <FollowButton 
                  userId={user.id}
                  followerCount={user._count.followers}
                />
                <button className="border border-cellar-300 text-cellar-700 hover:bg-cellar-50 px-6 py-2 rounded-md font-medium transition-colors">
                  Message
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-cellar-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setActiveTab('wines')}
              className={`text-center p-2 rounded transition-colors ${
                activeTab === 'wines' ? 'bg-wine-50 text-wine-700' : 'hover:bg-cellar-50'
              }`}
            >
              <div className="text-2xl font-bold text-cellar-800">{user._count.userWines}</div>
              <div className="text-sm text-cellar-600">Wines</div>
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`text-center p-2 rounded transition-colors ${
                activeTab === 'reviews' ? 'bg-wine-50 text-wine-700' : 'hover:bg-cellar-50'
              }`}
            >
              <div className="text-2xl font-bold text-cellar-800">{user._count.reviews}</div>
              <div className="text-sm text-cellar-600">Reviews</div>
            </button>
            <div className="text-center">
              <div className="text-2xl font-bold text-cellar-800">{user._count.followers}</div>
              <div className="text-sm text-cellar-600">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cellar-800">{user._count.following}</div>
              <div className="text-sm text-cellar-600">Following</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        {/* Tab Navigation */}
        <div className="border-b border-cellar-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'wines', label: 'Wine Collection', icon: '🍷' },
              { key: 'reviews', label: 'Reviews', icon: '⭐' },
              { key: 'activity', label: 'Activity', icon: '📱' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === tab.key
                    ? 'border-wine-500 text-wine-600'
                    : 'border-transparent text-cellar-500 hover:text-cellar-700 hover:border-cellar-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'wines' && (
            <WineCollectionTabs 
              userWines={[]} // TODO: Fetch user wines
              isOwnProfile={isOwnProfile}
            />
          )}

          {activeTab === 'reviews' && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-serif font-semibold text-cellar-800 mb-2">
                {isOwnProfile ? 'No reviews yet' : `${user.name} hasn't written any reviews yet`}
              </h3>
              <p className="text-cellar-600">
                {isOwnProfile 
                  ? 'Start by rating wines you\'ve tasted'
                  : 'Check back later for wine reviews'
                }
              </p>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <ActivityFeed userId={user.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
