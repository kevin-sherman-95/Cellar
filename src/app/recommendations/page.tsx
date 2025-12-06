import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getFeaturedWines, getHighestRatedWines, getPersonalizedRecommendations } from '@/lib/actions'
import RecommendationsClient from './RecommendationsClient'

export const metadata = {
  title: 'Recommendations | Cellar',
  description: 'Discover personalized wine recommendations based on your preferences',
}

export default async function RecommendationsPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  // Fetch all recommendation types in parallel
  const [featuredWines, highestRatedWines, personalizedWines] = await Promise.all([
    getFeaturedWines(8),
    getHighestRatedWines(8),
    userId ? getPersonalizedRecommendations(userId, 8) : Promise.resolve([])
  ])

  return (
    <RecommendationsClient
      featuredWines={featuredWines}
      highestRatedWines={highestRatedWines}
      personalizedWines={personalizedWines}
      isLoggedIn={!!userId}
    />
  )
}






