import { prisma } from './db'
import { WineFormData, ReviewFormData, UserProfileData, WineFilters } from './types'
import { findOrCreateWine } from './wine-actions'

// UserWineStatus values (moved out of server actions file)
export const USER_WINE_STATUS = {
  WANT_TO_TRY: 'WANT_TO_TRY',
  CURRENTLY_TASTING: 'CURRENTLY_TASTING', 
  TRIED: 'TRIED'
} as const

export type UserWineStatus = typeof USER_WINE_STATUS[keyof typeof USER_WINE_STATUS]

// Re-export server actions
export { getWines, getWineById, createWine, getWinesByVineyard, getVineyardStats, getFeaturedWines, getHighestRatedWines, getPersonalizedRecommendations } from './wine-actions'
export { findOrCreateWine }

// Get all unique varietals from the database
export async function getAllVarietals() {
  const wines = await prisma.wine.findMany({
    select: {
      varietal: true
    },
    distinct: ['varietal']
  })
  
  return wines.map(w => w.varietal).filter(Boolean).sort()
}

// User wine collection actions
export async function addWineToCollection(userId: string, wineId: string, status: string) {
  try {
    // Find existing entry with this status (for non-TRIED statuses, we want to update if exists)
    const existingEntry = await prisma.userWine.findFirst({
      where: {
        userId,
        wineId,
        status
      }
    })

    if (existingEntry) {
      return await prisma.userWine.update({
        where: { id: existingEntry.id },
        data: { status }
      })
    } else {
      return await prisma.userWine.create({
        data: {
          userId,
          wineId,
          status
        }
      })
    }
  } catch (error) {
    console.error('Error in addWineToCollection:', error)
    throw error
  }
}

export async function removeWineFromCollection(userId: string, wineId: string) {
  // Delete all entries for this user and wine
  // Note: This will delete all status entries (TRIED, WANT_TO_TRY, etc.)
  return await prisma.userWine.deleteMany({
    where: {
      userId,
      wineId
    }
  })
}

export async function removeUserWineEntry(userId: string, userWineId: string) {
  // Delete a specific userWine entry by ID (with userId verification for security)
  // This is useful for deleting individual TRIED entries when the same wine can have multiple entries
  console.log('removeUserWineEntry called with:', { userId, userWineId })
  
  const userWine = await prisma.userWine.findUnique({
    where: { id: userWineId }
  })

  console.log('Found userWine:', userWine ? { id: userWine.id, userId: userWine.userId, wineId: userWine.wineId, status: userWine.status } : 'not found')

  if (!userWine) {
    console.error('User wine entry not found for userWineId:', userWineId)
    throw new Error(`User wine entry not found: ${userWineId}`)
  }

  if (userWine.userId !== userId) {
    console.error('Unauthorized deletion attempt:', { entryUserId: userWine.userId, requestUserId: userId })
    throw new Error('Unauthorized: Cannot delete another user\'s wine entry')
  }

  console.log('Deleting userWine entry:', userWineId)
  const result = await prisma.userWine.delete({
    where: { id: userWineId }
  })
  
  console.log('Successfully deleted userWine entry:', result.id)
  return result
}

// Add wine to TRIED collection - always creates a new entry to allow multiple entries
export async function addWineToTried(userId: string, wineId: string) {
  return await prisma.userWine.create({
    data: {
      userId,
      wineId,
      status: USER_WINE_STATUS.TRIED,
      inCellar: false,
      quantity: 0
    }
  })
}

// Cellar management actions
export async function addWineToCellar(userId: string, wineId: string, quantity: number = 1) {
  try {
    // Find existing cellar entry for this user and wine
    const existingCellarEntry = await prisma.userWine.findFirst({
      where: {
        userId,
        wineId,
        inCellar: true
      }
    })

    if (existingCellarEntry) {
      // Increment quantity if wine is already in cellar
      const currentQuantity = existingCellarEntry.quantity || 0
      const newQuantity = currentQuantity + quantity
      return await prisma.userWine.update({
        where: { id: existingCellarEntry.id },
        data: {
          inCellar: true,
          quantity: newQuantity
        }
      })
    } else {
      // Check if there's any existing entry (even if not in cellar)
      const existingEntry = await prisma.userWine.findFirst({
        where: {
          userId,
          wineId
        }
      })

      if (existingEntry) {
        // Update existing entry to be in cellar
        // Increment quantity if it already exists, otherwise set to quantity
        const currentQuantity = existingEntry.quantity || 0
        const newQuantity = currentQuantity + quantity
        // Don't change status - keep existing status (cellar and tried are separate)
        return await prisma.userWine.update({
          where: { id: existingEntry.id },
          data: {
            inCellar: true,
            quantity: newQuantity
            // Don't set status - preserve existing status
          }
        })
      } else {
        // Create new cellar entry WITHOUT status TRIED
        // Cellar entries should not automatically be TRIED - only add to TRIED when explicitly requested
        return await prisma.userWine.create({
          data: {
            userId,
            wineId,
            status: 'WANT_TO_TRY', // Use a neutral status - cellar doesn't mean TRIED
            inCellar: true,
            quantity: quantity
          }
        })
      }
    }
  } catch (error) {
    console.error('Error in addWineToCellar:', error)
    throw error
  }
}

export async function removeWineFromCellar(userId: string, wineId: string) {
  try {
    // Find the cellar entry for this user and wine
    const cellarEntry = await prisma.userWine.findFirst({
      where: {
        userId,
        wineId,
        inCellar: true
      }
    })

    if (cellarEntry) {
      return await prisma.userWine.update({
        where: { id: cellarEntry.id },
        data: {
          inCellar: false,
          quantity: 0
        }
      })
    }
    
    // If no cellar entry found, return null (nothing to remove)
    return null
  } catch (error) {
    console.error('Error in removeWineFromCellar:', error)
    throw error
  }
}

export async function updateCellarQuantity(userId: string, wineId: string, quantity: number) {
  try {
    // Find the cellar entry for this user and wine
    const cellarEntry = await prisma.userWine.findFirst({
      where: {
        userId,
        wineId,
        inCellar: true
      }
    })

    if (cellarEntry) {
      return await prisma.userWine.update({
        where: { id: cellarEntry.id },
        data: {
          quantity: quantity,
          inCellar: quantity > 0
        }
      })
    }
    
    // If no cellar entry found, create one WITHOUT status TRIED
    // Cellar entries should not automatically be TRIED
    return await prisma.userWine.create({
      data: {
        userId,
        wineId,
        status: 'WANT_TO_TRY', // Use neutral status - cellar doesn't mean TRIED
        inCellar: quantity > 0,
        quantity: quantity
      }
    })
  } catch (error) {
    console.error('Error in updateCellarQuantity:', error)
    throw error
  }
}

export async function updateUserWineNotes(userId: string, wineId: string, notes: string | null, entryId?: string) {
  // If entryId is provided, update that specific entry
  // Otherwise, update the cellar entry (notes are typically for cellar entries)
  if (entryId) {
    return await prisma.userWine.update({
      where: { id: entryId },
      data: {
        notes: notes || null
      }
    })
  } else {
    // Find cellar entry and update its notes
    const cellarEntry = await prisma.userWine.findFirst({
      where: {
        userId,
        wineId,
        inCellar: true
      }
    })

    if (cellarEntry) {
      return await prisma.userWine.update({
        where: { id: cellarEntry.id },
        data: {
          notes: notes || null
        }
      })
    }
    
    return null
  }
}

export async function getUserWines(userId: string, status?: string) {
  const where: any = { userId }
  if (status) {
    where.status = status
  }

  return await prisma.userWine.findMany({
    where,
    include: {
      wine: {
        include: {
          _count: {
            select: { reviews: true }
          },
          reviews: {
            select: { rating: true }
          }
        }
      }
    },
    orderBy: { addedAt: 'desc' }
  })
}

// Helper function to ensure Pine Ridge wine is in user's tried collection
async function ensurePineRidgeInTried(userId: string) {
  const pineRidgeWineData = {
    name: 'Black Diamond Cabernet Sauvignon',
    vineyard: 'Pine Ridge Vineyards',
    region: 'Red Mountain',
    country: 'United States',
    varietal: 'Cabernet Sauvignon',
    vintage: 2022,
    description: 'A fitting homage to our founder, Gary Andrus, Black Diamond is a wine with an adventurous, far-reaching spirit. With a lush nose of double black raspberry compote and Rainier cherry, this expert-level Cabernet Sauvignon is as exhilarating as fresh morning tracks, tempting you to try an aerial maneuver. Sourced from Red Mountain vines that cascade like a freestyle run, it delivers a rich sensory experience, blending juniper berry and powdered sugar with savory notes of chanterelles and Santa Rosa plums.',
    alcoholContent: 15.0,
  }

  try {
    // Find or create the wine
    const wine = await findOrCreateWine(pineRidgeWineData)

    // Check if user already has this wine in their tried collection
    const existingUserWine = await prisma.userWine.findFirst({
      where: {
        userId,
        wineId: wine.id
      }
    })

    if (!existingUserWine) {
      // Add to cellar collection if not already present
      await addWineToCollection(userId, wine.id, USER_WINE_STATUS.TRIED)
    }
  } catch (error) {
    console.error('Error ensuring Pine Ridge wine in tried collection:', error)
    // Don't throw error here to avoid breaking the main function
  }
}

// New function specifically for getting user wines with their reviews
export async function getUserWinesWithReviews(userId: string, status?: string) {
  // Removed auto-adding Pine Ridge wine - wines should only be added when user explicitly clicks "Add to Tried"
  // await ensurePineRidgeInTried(userId)

  const where: any = { userId }
  if (status) {
    where.status = status
  }

  const userWines = await prisma.userWine.findMany({
    where,
    include: {
      wine: {
        include: {
          _count: {
            select: { reviews: true, userWines: true }
          },
          reviews: {
            select: { rating: true }
          }
        }
      }
    },
    orderBy: { addedAt: 'desc' }
  })

  // For each user wine, get their review if it exists and calculate average rating
  const userWinesWithReviews = await Promise.all(
    userWines.map(async (userWine) => {
      const userReview = await prisma.review.findFirst({
        where: {
          userId,
          wineId: userWine.wineId
        }
      })

      // Calculate average rating for the wine
      const averageRating = userWine.wine.reviews.length > 0 
        ? userWine.wine.reviews.reduce((acc, review) => acc + review.rating, 0) / userWine.wine.reviews.length
        : 0

      return {
        ...userWine,
        userReview,
        wine: {
          ...userWine.wine,
          averageRating,
          _count: {
            reviews: userWine.wine._count.reviews,
            userWines: (userWine.wine._count as any).userWines ?? 0
          }
        }
      }
    })
  )

  return userWinesWithReviews
}

// Review actions
export async function createReview(userId: string, wineId: string, data: ReviewFormData) {
  // Check if review already exists
  const existingReview = await prisma.review.findFirst({
    where: {
      userId,
      wineId
    }
  })

  if (existingReview) {
    // Update existing review
    return await prisma.review.update({
      where: { id: existingReview.id },
      data: {
        rating: data.rating,
        notes: data.notes,
        photos: data.photos ? JSON.stringify(data.photos) : null
      }
    })
  } else {
    // Create new review
    return await prisma.review.create({
      data: {
        userId,
        wineId,
        rating: data.rating,
        notes: data.notes,
        photos: data.photos ? JSON.stringify(data.photos) : null
      }
    })
  }
}

export async function getReviewsByUser(userId: string) {
  return await prisma.review.findMany({
    where: { userId },
    include: {
      wine: {
        select: { id: true, name: true, vineyard: true, vintage: true }
      },
      _count: {
        select: { likes: true, comments: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          reviews: true,
          followers: true,
          following: true,
          userWines: true
        }
      }
    }
  })
}

// Social actions
export async function followUser(followerId: string, followingId: string) {
  return await prisma.follow.create({
    data: { followerId, followingId }
  })
}

export async function unfollowUser(followerId: string, followingId: string) {
  return await prisma.follow.delete({
    where: {
      followerId_followingId: { followerId, followingId }
    }
  })
}

export async function toggleLike(userId: string, reviewId: string) {
  const existing = await prisma.like.findUnique({
    where: {
      userId_reviewId: { userId, reviewId }
    }
  })

  if (existing) {
    await prisma.like.delete({
      where: { id: existing.id }
    })
    return false
  } else {
    await prisma.like.create({
      data: { userId, reviewId }
    })
    return true
  }
}

// Server action to add Pine Ridge Black Diamond Cabernet Sauvignon to user's TRIED collection
export async function addPineRidgeBlackDiamondToTried(userId: string) {
  const wineData = {
    name: 'Black Diamond Cabernet Sauvignon',
    vineyard: 'Pine Ridge Vineyards',
    region: 'Red Mountain',
    country: 'United States',
    varietal: 'Cabernet Sauvignon',
    vintage: 2022,
    description: 'A fitting homage to our founder, Gary Andrus, Black Diamond is a wine with an adventurous, far-reaching spirit. With a lush nose of double black raspberry compote and Rainier cherry, this expert-level Cabernet Sauvignon is as exhilarating as fresh morning tracks, tempting you to try an aerial maneuver. Sourced from Red Mountain vines that cascade like a freestyle run, it delivers a rich sensory experience, blending juniper berry and powdered sugar with savory notes of chanterelles and Santa Rosa plums.',
    alcoholContent: 15.0,
  }

  try {
    // Find or create the wine
    const wine = await findOrCreateWine(wineData)

    // Add wine to user's TRIED collection (always creates new entry)
    await addWineToTried(userId, wine.id)
    
    // Also add to cellar for testing purposes
    const existingUserWine = await prisma.userWine.findFirst({
      where: {
        userId,
        wineId: wine.id
      }
    })

    if (existingUserWine) {
      await prisma.userWine.update({
        where: { id: existingUserWine.id },
        data: {
          inCellar: true,
          quantity: 1
        }
      })
    } else {
      await prisma.userWine.create({
        data: {
          userId,
          wineId: wine.id,
          status: USER_WINE_STATUS.TRIED,
          inCellar: true,
          quantity: 1
        }
      })
    }

    return { success: true, wineId: wine.id, wineName: wine.name }
  } catch (error) {
    console.error('Error adding Pine Ridge wine to tried collection:', error)
    throw new Error('Failed to add wine to collection')
  }
}
