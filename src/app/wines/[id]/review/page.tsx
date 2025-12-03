import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWineById } from '@/lib/actions'
import ReviewPageClient from './ReviewPageClient'

interface ReviewPageProps {
  params: {
    id: string
  }
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const wine = await getWineById(params.id)

  if (!wine) {
    notFound()
  }

  // Check if user already has a review for this wine
  const existingReview = wine.reviews.find(
    (review: any) => review.user.id === session.user.id
  )

  return <ReviewPageClient wine={wine} existingReview={existingReview} />
}
