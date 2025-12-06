import { notFound } from 'next/navigation'
import { getWineById } from '@/lib/actions'
import WineDetailClient from './WineDetailClient'

interface WinePageProps {
  params: {
    id: string
  }
}

export default async function WinePage({ params }: WinePageProps) {
  const wine = await getWineById(params.id)

  if (!wine) {
    notFound()
  }

  // Calculate average rating
  const reviews = wine.reviews || []
  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0

  const wineWithAverage = {
    ...wine,
    averageRating,
    reviews // Ensure reviews array exists
  }

  return <WineDetailClient wine={wineWithAverage} />
}
