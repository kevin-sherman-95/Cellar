import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample wines
  const wines = await Promise.all([
    prisma.wine.create({
      data: {
        name: 'Château Margaux 2015',
        vineyard: 'Château Margaux',
        region: 'Margaux, Bordeaux',
        country: 'France',
        varietal: 'Cabernet Sauvignon Blend',
        vintage: 2015,
        description: 'An exceptional vintage with notes of blackcurrant, violet, and subtle oak. Full-bodied with elegant tannins.',
        alcoholContent: 13.5,
      },
    }),
    prisma.wine.create({
      data: {
        name: 'Opus One 2018',
        vineyard: 'Opus One Winery',
        region: 'Napa Valley',
        country: 'United States',
        varietal: 'Cabernet Sauvignon Blend',
        vintage: 2018,
        description: 'A harmonious blend showcasing dark fruit flavors with hints of chocolate and spice. Smooth finish.',
        alcoholContent: 15.0,
      },
    }),
    prisma.wine.create({
      data: {
        name: 'Dom Pérignon 2012',
        vineyard: 'Moët & Chandon',
        region: 'Champagne',
        country: 'France',
        varietal: 'Chardonnay, Pinot Noir',
        vintage: 2012,
        description: 'Crisp and elegant champagne with fine bubbles, citrus notes, and a mineral finish.',
        alcoholContent: 12.5,
      },
    }),
    prisma.wine.create({
      data: {
        name: 'Cloudy Bay Sauvignon Blanc 2022',
        vineyard: 'Cloudy Bay',
        region: 'Marlborough',
        country: 'New Zealand',
        varietal: 'Sauvignon Blanc',
        vintage: 2022,
        description: 'Vibrant and fresh with tropical fruit flavors, grapefruit, and herbaceous notes.',
        alcoholContent: 13.0,
      },
    }),
    prisma.wine.create({
      data: {
        name: 'Barolo Brunate 2017',
        vineyard: 'Giuseppe Rinaldi',
        region: 'Piedmont',
        country: 'Italy',
        varietal: 'Nebbiolo',
        vintage: 2017,
        description: 'Traditional Barolo with intense aromas of roses, tar, and red fruit. Complex and age-worthy.',
        alcoholContent: 14.5,
      },
    }),
  ])

  console.log(`✅ Created ${wines.length} sample wines`)
  console.log('🌱 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
