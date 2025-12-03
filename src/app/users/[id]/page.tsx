import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import UserProfileClient from './UserProfileClient'

interface UserPageProps {
  params: {
    id: string
  }
}

export default async function UserPage({ params }: UserPageProps) {
  const session = await getServerSession(authOptions)
  
  // TODO: Fetch user by ID from database
  // For now, we'll use mock data
  const mockUser = {
    id: params.id,
    name: 'Wine Enthusiast',
    bio: 'Passionate about discovering exceptional wines from around the world.',
    location: 'Napa Valley, CA',
    avatar: null,
    createdAt: new Date('2024-01-01'),
    _count: {
      reviews: 15,
      followers: 42,
      following: 28,
      userWines: 34
    }
  }

  if (!mockUser) {
    notFound()
  }

  const isOwnProfile = session?.user?.id === params.id

  return (
    <UserProfileClient 
      user={mockUser} 
      isOwnProfile={isOwnProfile}
      currentUserId={session?.user?.id}
    />
  )
}
