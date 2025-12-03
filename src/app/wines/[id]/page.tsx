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
  const averageRating = wine.reviews.length > 0
    ? wine.reviews.reduce((acc, review) => acc + review.rating, 0) / wine.reviews.length
    : 0

  const wineWithAverage = {
    ...wine,
    averageRating
  }

  return <WineDetailClient wine={wineWithAverage} />
}
