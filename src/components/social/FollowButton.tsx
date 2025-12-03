'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface FollowButtonProps {
  userId: string
  initialFollowing?: boolean
  followerCount?: number
}

export default function FollowButton({ 
  userId, 
  initialFollowing = false, 
  followerCount = 0 
}: FollowButtonProps) {
  const { data: session } = useSession()
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [followers, setFollowers] = useState(followerCount)
  const [isLoading, setIsLoading] = useState(false)

  const handleFollow = async () => {
    if (!session?.user) {
      window.location.href = '/auth/signin'
      return
    }

    if (session.user.id === userId) {
      return // Can't follow yourself
    }

    setIsLoading(true)
    
    try {
      const newFollowingState = !isFollowing
      setIsFollowing(newFollowingState)
      setFollowers(prev => newFollowingState ? prev + 1 : prev - 1)

      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay

    } catch (error) {
      // Revert on error
      setIsFollowing(!isFollowing)
      setFollowers(prev => isFollowing ? prev + 1 : prev - 1)
      console.error('Error toggling follow:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show follow button for own profile
  if (session?.user?.id === userId) {
    return null
  }

  // Show sign in prompt if not authenticated
  if (!session?.user) {
    return (
      <button
        onClick={handleFollow}
        className="border border-wine-600 text-wine-600 hover:bg-wine-50 px-6 py-2 rounded-md font-medium transition-colors"
      >
        Follow
      </button>
    )
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? 'bg-cellar-600 hover:bg-cellar-700 text-white'
          : 'wine-gradient text-white hover:opacity-90'
      }`}
    >
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
        </span>
      ) : (
        <>
          {isFollowing ? 'Following' : 'Follow'}
          {followers > 0 && (
            <span className="ml-1">({followers})</span>
          )}
        </>
      )}
    </button>
  )
}
