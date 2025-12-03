'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WineCollectionTabs from '@/components/profile/WineCollectionTabs'
import { UserWithStats, UserWineWithDetails, UserWineWithReview } from '@/lib/types'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [user, setUser] = useState<UserWithStats | null>(null)
  const [userWines, setUserWines] = useState<(UserWineWithDetails | UserWineWithReview)[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    // Fetch user profile and wines from API
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user-profile')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          console.error('Failed to fetch user profile:', response.status)
          // Fallback to session data if API fails
          const fallbackUser: UserWithStats = {
            id: session.user.id || '1',
            email: session.user.email || '',
            name: session.user.name || 'Wine Enthusiast',
            bio: null,
            location: null,
            avatar: session.user.image || null,
            password: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: null,
            image: session.user.image || null,
            _count: {
              reviews: 0,
              followers: 0,
              following: 0,
              userWines: 0
            }
          }
          setUser(fallbackUser)
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        // Fallback to session data if API fails
        const fallbackUser: UserWithStats = {
          id: session.user.id || '1',
          email: session.user.email || '',
          name: session.user.name || 'Wine Enthusiast',
          bio: null,
          location: null,
          avatar: session.user.image || null,
          password: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailVerified: null,
          image: session.user.image || null,
          _count: {
            reviews: 0,
            followers: 0,
            following: 0,
            userWines: 0
          }
        }
        setUser(fallbackUser)
      }
    }

    const fetchUserWines = async () => {
      try {
        const response = await fetch('/api/user-wines')
        if (response.ok) {
          const data = await response.json()
          setUserWines(data)
        } else {
          console.error('Failed to fetch user wines:', response.status)
          setUserWines([])
        }
      } catch (error) {
        console.error('Failed to fetch user wines:', error)
        setUserWines([])
      }
    }

    // Fetch both profile and wines data
    const fetchData = async () => {
      await Promise.all([
        fetchUserProfile(),
        fetchUserWines()
      ])
      setLoading(false)
    }

    fetchData()
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-cellar-200 rounded mb-4 w-1/3"></div>
          <div className="h-40 bg-cellar-200 rounded mb-6"></div>
          <div className="h-96 bg-cellar-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <div>Error loading profile</div>
  }

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
                  alt={user.name || 'Profile'} 
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
            <a
              href="/settings"
              className="wine-gradient text-white px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity text-center"
            >
              Edit Profile
            </a>
            <button className="border border-cellar-300 text-cellar-700 hover:bg-cellar-50 px-6 py-2 rounded-md font-medium transition-colors">
              Share Profile
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-cellar-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cellar-800">{user._count.userWines}</div>
              <div className="text-sm text-cellar-600">Wines</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cellar-800">{user._count.reviews}</div>
              <div className="text-sm text-cellar-600">Reviews</div>
            </div>
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

      {/* Wine Collections */}
      <WineCollectionTabs userWines={userWines} isOwnProfile={true} />
    </div>
  )
}
