/**
 * Vivino Wine Database Seeder
 * Imports wines from data/vivino-wines.json into the database
 * Copyright Anysphere Inc.
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

interface ScrapedWine {
  name: string
  vineyard: string
  region: string
  country: string
  varietal: string
  vintage: number | null
  description: string | null
  alcoholContent: number | null
  image: string | null
  vivinoRating: number | null
  vivinoRatingCount: number | null
  price: number | null
}

interface VivinoScrapedData {
  wines: ScrapedWine[]
  scrapedAt: string
  source: string
}

async function main() {
  console.log('🍷 Starting Vivino wine import...')

  // Read the JSON file
  const dataPath = path.join(__dirname, '..', 'data', 'vivino-wines.json')
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Error: vivino-wines.json not found at', dataPath)
    console.log('   Please run the scraper first: npm run scrape:vivino')
    process.exit(1)
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8')
  const data: VivinoScrapedData = JSON.parse(rawData)

  console.log(`📊 Found ${data.wines.length} wines to import`)
  console.log(`📅 Data scraped at: ${data.scrapedAt}`)

  let created = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const wine of data.wines) {
    try {
      // Create a unique identifier based on name and vintage
      const uniqueKey = `${wine.name.toLowerCase().trim()}-${wine.vintage || 'nv'}`

      // Check if wine already exists (by name and vintage)
      const existingWine = await prisma.wine.findFirst({
        where: {
          AND: [
            { name: wine.name },
            { vintage: wine.vintage }
          ]
        }
      })

      if (existingWine) {
        // Update existing wine if it has less data
        const needsUpdate = !existingWine.description && wine.description

        if (needsUpdate) {
          await prisma.wine.update({
            where: { id: existingWine.id },
            data: {
              description: wine.description,
              alcoholContent: wine.alcoholContent || existingWine.alcoholContent,
              image: wine.image || existingWine.image
            }
          })
          updated++
          console.log(`  ✏️  Updated: ${wine.name}`)
        } else {
          skipped++
        }
      } else {
        // Create new wine
        await prisma.wine.create({
          data: {
            name: wine.name,
            vineyard: wine.vineyard,
            region: wine.region,
            country: wine.country,
            varietal: wine.varietal,
            vintage: wine.vintage,
            description: wine.description,
            alcoholContent: wine.alcoholContent,
            image: wine.image
          }
        })
        created++
        console.log(`  ✅ Created: ${wine.name}`)
      }
    } catch (error) {
      errors++
      console.error(`  ❌ Error importing ${wine.name}:`, error)
    }
  }

  console.log('\n📈 Import Summary:')
  console.log(`   ✅ Created: ${created} wines`)
  console.log(`   ✏️  Updated: ${updated} wines`)
  console.log(`   ⏭️  Skipped: ${skipped} wines (already exist)`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log('\n🎉 Vivino wine import complete!')
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
