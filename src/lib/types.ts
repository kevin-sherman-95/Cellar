import { User, Wine, Review, UserWine, Follow, Comment, Like } from '@prisma/client'

// Extended types with relations
export type UserWithStats = User & {
  _count: {
    reviews: number
    followers: number
    following: number
    userWines: number
  }
}

export type WineWithDetails = Wine & {
  _count: {
    reviews: number
    userWines: number
  }
  averageRating: number
  source?: 'local' | 'external'
}

export type ReviewWithDetails = Review & {
  user: Pick<User, 'id' | 'name' | 'avatar'>
  wine: Pick<Wine, 'id' | 'name' | 'vineyard' | 'vintage'>
  _count: {
    likes: number
    comments: number
  }
  isLiked?: boolean
}

export type UserWineWithDetails = UserWine & {
  wine: WineWithDetails
}

export type UserWineWithReview = UserWine & {
  wine: WineWithDetails
  userReview: Review | null
}

// Form types
export interface WineFormData {
  name: string
  vineyard: string
  region: string
  country: string
  varietal: string
  vintage?: number
  description?: string
  alcoholContent?: number
  image?: string
}

export interface ReviewFormData {
  rating: number
  notes?: string
  photos?: string[]
}

export interface UserProfileData {
  name?: string
  bio?: string
  location?: string
  avatar?: string
}

// Search and filter types
export interface WineFilters {
  search?: string
  varietal?: string
  region?: string
  country?: string
  minRating?: number
  maxRating?: number
  vintage?: number
}

export interface ActivityItem {
  id: string
  type: 'review' | 'follow' | 'wine_added'
  user: Pick<User, 'id' | 'name' | 'avatar'>
  createdAt: Date
  data: Record<string, any>
}
