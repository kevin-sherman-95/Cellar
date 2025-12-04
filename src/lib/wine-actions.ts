'use server'

import { prisma } from './db'
import { WineFormData, ReviewFormData, UserProfileData, WineFilters } from './types'
import { searchAllExternalSources, cacheExternalWine, ExternalWine } from './wine-api'

// Wine actions
export async function getWines(filters?: WineFilters, includeExternal: boolean = true) {
  try {
    const where: any = {}
    
    // Only add search filter if search query is not empty
    const hasSearchQuery = filters?.search && filters.search.trim().length > 0
    
    if (hasSearchQuery) {
      where.OR = [
        { name: { contains: filters.search } },
        { vineyard: { contains: filters.search } },
        { region: { contains: filters.search } },
        { varietal: { contains: filters.search } },
      ]
    }
    
    if (filters?.varietal) {
      where.varietal = { contains: filters.varietal }
    }
    
    if (filters?.region) {
      where.region = { contains: filters.region }
    }
    
    if (filters?.country) {
      where.country = { contains: filters.country }
    }
    
    if (filters?.vintage) {
      where.vintage = filters.vintage
    }

    // Search local database with a reasonable limit for browsing
    // When browsing without search, limit to 100 wines for performance
    const limit = hasSearchQuery ? undefined : 100
    
    const localWines = await prisma.wine.findMany({
      where,
      include: {
        _count: {
          select: { reviews: true, userWines: true }
        },
        reviews: {
          select: { rating: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit })
    })

    const localResults = localWines.map(wine => ({
      ...wine,
      averageRating: wine.reviews.length > 0 
        ? wine.reviews.reduce((acc, review) => acc + review.rating, 0) / wine.reviews.length
        : 0,
      source: 'local' as const
    }))

    // If no local results and search query exists, try external sources
    if (includeExternal && hasSearchQuery && localResults.length === 0) {
      try {
        const externalWines = await searchAllExternalSources(filters.search!.trim(), {
          varietal: filters.varietal,
          region: filters.region,
          country: filters.country,
          vintage: filters.vintage,
        })

        // Cache external wines in database for future searches
        const cachedWineIds: string[] = []
        for (const externalWine of externalWines) {
          try {
            const wineId = await cacheExternalWine(externalWine)
            cachedWineIds.push(wineId)
          } catch (error) {
            console.error('Error caching external wine:', error)
          }
        }

        // Fetch cached wines from database with full details
        if (cachedWineIds.length > 0) {
          const cachedWines = await prisma.wine.findMany({
            where: {
              id: { in: cachedWineIds }
            },
            include: {
              _count: {
                select: { reviews: true, userWines: true }
              },
              reviews: {
                select: { rating: true }
              }
            }
          })

          const cachedResults = cachedWines.map(wine => ({
            ...wine,
            averageRating: wine.reviews.length > 0 
              ? wine.reviews.reduce((acc, review) => acc + review.rating, 0) / wine.reviews.length
              : 0,
            source: 'external' as const
          }))

          return cachedResults
        }
      } catch (error) {
        console.error('Error fetching external wines:', error)
        // Fall through to return local results only
      }
    }

    return localResults
  } catch (error) {
    console.error('Error in getWines:', error)
    // Return empty array on error instead of throwing
    return []
  }
}

/**
 * Search external wine sources without caching
 * Returns external wine data that hasn't been imported yet
 */
export async function searchExternalWines(filters?: WineFilters): Promise<ExternalWine[]> {
  if (!filters?.search) {
    return []
  }

  try {
    const externalWines = await searchAllExternalSources(filters.search, {
      varietal: filters.varietal,
      region: filters.region,
      country: filters.country,
      vintage: filters.vintage,
    })

    // Filter out wines that already exist in local database
    // Check each wine individually to avoid Prisma OR limitations
    const existingWineKeys = new Set<string>()
    
    for (const wine of externalWines) {
      const existing = await prisma.wine.findFirst({
        where: {
          name: wine.name,
          vineyard: wine.vineyard || 'Unknown',
          vintage: wine.vintage || null,
        },
        select: {
          name: true,
          vineyard: true,
          vintage: true,
        }
      })
      
      if (existing) {
        const key = `${existing.name}|${existing.vineyard}|${existing.vintage}`
        existingWineKeys.add(key)
      }
    }

    return externalWines.filter(wine => {
      const key = `${wine.name}|${wine.vineyard || 'Unknown'}|${wine.vintage || null}`
      return !existingWineKeys.has(key)
    })
  } catch (error) {
    console.error('Error searching external wines:', error)
    return []
  }
}

export async function getWineById(id: string) {
  return await prisma.wine.findUnique({
    where: { id },
    include: {
      _count: {
        select: { reviews: true, userWines: true }
      },
      reviews: {
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          },
          _count: {
            select: { likes: true, comments: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })
}

/**
 * Get a default wine bottle image (Vivino fallback bottle)
 */
function getDefaultWineImage(): string {
  return 'https://web-common.vivino.com/assets/bottleShot/fallback_1.png'
}

export async function createWine(data: WineFormData) {
  return await prisma.wine.create({
    data: {
      ...data,
      vintage: data.vintage || null,
      alcoholContent: data.alcoholContent || null,
      image: data.image || getDefaultWineImage(),
    }
  })
}

export async function findOrCreateWine(data: WineFormData) {
  // First try to find existing wine by name, vineyard, and vintage
  const existingWine = await prisma.wine.findFirst({
    where: {
      name: data.name,
      vineyard: data.vineyard,
      vintage: data.vintage || null,
    }
  })

  if (existingWine) {
    return existingWine
  }

  // Create new wine if not found
  return await createWine(data)
}

export async function getWinesByVineyard(vineyardName: string) {
  // SQLite doesn't support case-insensitive mode, so we'll search for exact match
  // In production with PostgreSQL, you could use mode: 'insensitive'
  const wines = await prisma.wine.findMany({
    where: {
      vineyard: vineyardName
    },
    include: {
      _count: {
        select: { reviews: true, userWines: true }
      },
      reviews: {
        select: { rating: true }
      }
    },
    orderBy: [
      { vintage: 'desc' },
      { name: 'asc' }
    ]
  })

  return wines.map(wine => ({
    ...wine,
    averageRating: wine.reviews.length > 0 
      ? wine.reviews.reduce((acc, review) => acc + review.rating, 0) / wine.reviews.length
      : 0,
    source: 'local' as const
  }))
}

export async function getVineyardStats(vineyardName: string) {
  // SQLite doesn't support case-insensitive mode, so we'll search for exact match
  const wines = await prisma.wine.findMany({
    where: {
      vineyard: vineyardName
    },
    include: {
      reviews: {
        select: { rating: true }
      },
      userWines: {
        select: { id: true }
      }
    }
  })

  const totalWines = wines.length
  const totalReviews = wines.reduce((sum, wine) => sum + wine.reviews.length, 0)
  const totalInCellars = wines.reduce((sum, wine) => sum + wine.userWines.length, 0)
  
  const allRatings = wines.flatMap(wine => wine.reviews.map(r => r.rating))
  const averageRating = allRatings.length > 0
    ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
    : 0

  const regions = Array.from(new Set(wines.map(wine => wine.region).filter(Boolean)))
  const countries = Array.from(new Set(wines.map(wine => wine.country).filter(Boolean)))
  const varietals = Array.from(new Set(wines.map(wine => wine.varietal).filter(Boolean)))
  const vintages = Array.from(
    new Set(wines.map(wine => wine.vintage).filter(Boolean))
  ).sort((a, b) => (b || 0) - (a || 0))

  return {
    totalWines,
    totalReviews,
    totalInCellars,
    averageRating: Number(averageRating.toFixed(1)),
    regions,
    countries,
    varietals,
    vintages
  }
}

/**
 * Get featured wines - most popular based on user collections and reviews
 */
export async function getFeaturedWines(limit: number = 8) {
  const wines = await prisma.wine.findMany({
    include: {
      _count: {
        select: { reviews: true, userWines: true }
      },
      reviews: {
        select: { rating: true }
      }
    },
    orderBy: {
      userWines: { _count: 'desc' }
    },
    take: limit
  })

  return wines.map(wine => ({
    ...wine,
    averageRating: wine.reviews.length > 0 
      ? wine.reviews.reduce((acc, review) => acc + review.rating, 0) / wine.reviews.length
      : 0,
    source: 'local' as const
  }))
}

/**
 * Get a random selection of wines for featured display on the homepage.
 * This samples from the entire browseable wine database so the homepage
 * featured section rotates between different wines over time.
 */
export async function getRandomFeaturedWines(limit: number = 3) {
  // Get total number of wines in the database
  const totalWines = await prisma.wine.count()

  if (totalWines === 0) {
    return []
  }

  const sampleSize = Math.min(limit, totalWines)

  // Generate unique random indices to avoid duplicates
  const indices = new Set<number>()
  while (indices.size < sampleSize) {
    const randomIndex = Math.floor(Math.random() * totalWines)
    indices.add(randomIndex)
  }

  const wines = []

  // Fetch each randomly selected wine using skip/take
  for (const index of Array.from(indices)) {
    const result = await prisma.wine.findMany({
      skip: index,
      take: 1,
      orderBy: {
        id: 'asc'
      },
      include: {
        _count: {
          select: { reviews: true, userWines: true }
        },
        reviews: {
          select: { rating: true }
        }
      }
    })

    if (result[0]) {
      const wine = result[0]
      wines.push({
        ...wine,
        averageRating: wine.reviews.length > 0
          ? wine.reviews.reduce((acc, review) => acc + review.rating, 0) / wine.reviews.length
          : 0,
        source: 'local' as const
      })
    }
  }

  return wines
}

/**
 * Get highest rated wines - sorted by average rating
 */
export async function getHighestRatedWines(limit: number = 8) {
  // Fetch wines with at least one review
  const wines = await prisma.wine.findMany({
    where: {
      reviews: {
        some: {}
      }
    },
    include: {
      _count: {
        select: { reviews: true, userWines: true }
      },
      reviews: {
        select: { rating: true }
      }
    }
  })

  // Calculate average rating and sort
  const winesWithRatings = wines.map(wine => ({
    ...wine,
    averageRating: wine.reviews.reduce((acc, review) => acc + review.rating, 0) / wine.reviews.length,
    source: 'local' as const
  }))

  // Sort by average rating descending, then by number of reviews
  return winesWithRatings
    .sort((a, b) => {
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating
      }
      return b._count.reviews - a._count.reviews
    })
    .slice(0, limit)
}

/**
 * Get personalized wine recommendations based on user's collection preferences
 */
export async function getPersonalizedRecommendations(userId: string, limit: number = 8) {
  // Get user's wine collection to analyze preferences
  const userWines = await prisma.userWine.findMany({
    where: { userId },
    include: {
      wine: {
        select: {
          id: true,
          varietal: true,
          region: true,
          country: true
        }
      }
    }
  })

  if (userWines.length === 0) {
    // No collection yet, return empty array
    return []
  }

  // Extract user's wine IDs to exclude from recommendations
  const userWineIds = userWines.map(uw => uw.wine.id)

  // Analyze preferences - count varietals and regions
  const varietalCounts: Record<string, number> = {}
  const regionCounts: Record<string, number> = {}

  userWines.forEach(uw => {
    if (uw.wine.varietal) {
      varietalCounts[uw.wine.varietal] = (varietalCounts[uw.wine.varietal] || 0) + 1
    }
    if (uw.wine.region) {
      regionCounts[uw.wine.region] = (regionCounts[uw.wine.region] || 0) + 1
    }
  })

  // Get top varietals and regions (user's preferences)
  const topVarietals = Object.entries(varietalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([varietal]) => varietal)

  const topRegions = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([region]) => region)

  // Find wines matching user's preferences that they don't already have
  const recommendedWines = await prisma.wine.findMany({
    where: {
      AND: [
        { id: { notIn: userWineIds } },
        {
          OR: [
            { varietal: { in: topVarietals } },
            { region: { in: topRegions } }
          ]
        }
      ]
    },
    include: {
      _count: {
        select: { reviews: true, userWines: true }
      },
      reviews: {
        select: { rating: true }
      }
    }
  })

  // Calculate ratings and sort by rating then popularity
  const winesWithRatings = recommendedWines.map(wine => ({
    ...wine,
    averageRating: wine.reviews.length > 0 
      ? wine.reviews.reduce((acc, review) => acc + review.rating, 0) / wine.reviews.length
      : 0,
    source: 'local' as const
  }))

  return winesWithRatings
    .sort((a, b) => {
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating
      }
      return b._count.userWines - a._count.userWines
    })
    .slice(0, limit)
}
