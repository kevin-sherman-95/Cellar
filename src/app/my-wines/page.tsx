import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getUserWinesWithReviews } from '@/lib/actions'
import MyWinesClient from './MyWinesClient'
import type { UserWineWithDetails, UserWineWithReview } from '@/lib/types'

export default async function MyWinesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Fetch user wines on the server
  let userWines: (UserWineWithDetails | UserWineWithReview)[] = []
  try {
    const fetchedWines = await getUserWinesWithReviews(session.user.id)
    userWines = Array.isArray(fetchedWines) ? fetchedWines : []
  } catch (error) {
    console.error('Error fetching user wines:', error)
    userWines = []
  }

  return <MyWinesClient userWines={userWines} />
}
