/**
 * Batch script to fetch wine bottle images from Vivino
 * Copyright Anysphere Inc.
 * 
 * Usage:
 *   npx tsx scripts/fetch-wine-images-from-vivino.ts [options]
 * 
 * Options:
 *   --id <wine-id>       Fetch image for a specific wine
 *   --limit <number>     Max wines to process (default: 50)
 *   --delay <ms>         Delay between requests in ms (default: 1500)
 *   --dry-run            Preview what would be fetched without making changes
 *   --vineyard <name>    Only process wines from this vineyard
 *   --force              Re-fetch images even if wine already has one
 *   --help               Show help message
 * 
 * Examples:
 *   npx tsx scripts/fetch-wine-images-from-vivino.ts
 *   npx tsx scripts/fetch-wine-images-from-vivino.ts --limit 100 --delay 2000
 *   npx tsx scripts/fetch-wine-images-from-vivino.ts --vineyard "Opus One"
 *   npx tsx scripts/fetch-wine-images-from-vivino.ts --dry-run
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'
import { getVivinoWineImage } from '../src/lib/vivino-image-fetcher'
import { findWineImageMapping } from '../src/lib/wine-image-mapping'

const prisma = new PrismaClient()

interface Options {
  wineId?: string
  limit: number
  delay: number
  dryRun: boolean
  vineyard?: string
  force: boolean
}

interface FetchResult {
  wineId: string
  wineName: string
  vineyard: string
  success: boolean
  source?: 'vivino' | 'override' | 'skipped'
  imageUrl?: string
  error?: string
}

function parseArgs(): Options {
  const args = process.argv.slice(2)
  
  const getArg = (flag: string): string | undefined => {
    const index = args.indexOf(flag)
    return index >= 0 && args[index + 1] ? args[index + 1] : undefined
  }
  
  return {
    wineId: getArg('--id'),
    limit: parseInt(getArg('--limit') || '50', 10),
    delay: parseInt(getArg('--delay') || '1500', 10),
    dryRun: args.includes('--dry-run'),
    vineyard: getArg('--vineyard'),
    force: args.includes('--force'),
  }
}

function printUsage(): void {
  console.log(`
🍷 Wine Image Batch Fetcher
===========================

Fetches wine bottle images from Vivino and updates the database.

Usage:
  npx tsx scripts/fetch-wine-images-from-vivino.ts [options]

Options:
  --id <wine-id>       Fetch image for a specific wine by ID
  --limit <number>     Max wines to process (default: 50)
  --delay <ms>         Delay between requests in ms (default: 1500)
  --dry-run            Preview what would be fetched without making changes
  --vineyard <name>    Only process wines from this vineyard
  --force              Re-fetch images even if wine already has one
  --help               Show this help message

Examples:
  # Fetch images for up to 50 wines without images
  npx tsx scripts/fetch-wine-images-from-vivino.ts

  # Process 100 wines with 2-second delay
  npx tsx scripts/fetch-wine-images-from-vivino.ts --limit 100 --delay 2000

  # Only process wines from a specific vineyard
  npx tsx scripts/fetch-wine-images-from-vivino.ts --vineyard "Opus One"

  # Preview what would be fetched (no database changes)
  npx tsx scripts/fetch-wine-images-from-vivino.ts --dry-run

  # Fetch for a specific wine
  npx tsx scripts/fetch-wine-images-from-vivino.ts --id clx123...
`)
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

function progressBar(current: number, total: number, width = 30): string {
  const percent = Math.round((current / total) * 100)
  const filled = Math.round((current / total) * width)
  const empty = width - filled
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`
}

async function fetchWineImage(
  wine: { id: string; name: string; vineyard: string; vintage: number | null; image: string | null },
  options: Options
): Promise<FetchResult> {
  const wineDesc = `${wine.vineyard} ${wine.name}${wine.vintage ? ` ${wine.vintage}` : ''}`
  
  // Check if wine already has an image (unless force is set)
  if (wine.image && !options.force) {
    return {
      wineId: wine.id,
      wineName: wine.name,
      vineyard: wine.vineyard,
      success: false,
      source: 'skipped',
      error: 'Already has image'
    }
  }
  
  // Check for manual override first
  const override = findWineImageMapping(wine.name, wine.vineyard, wine.vintage)
  if (override) {
    if (!options.dryRun) {
      await prisma.wine.update({
        where: { id: wine.id },
        data: { image: override }
      })
    }
    return {
      wineId: wine.id,
      wineName: wine.name,
      vineyard: wine.vineyard,
      success: true,
      source: 'override',
      imageUrl: override
    }
  }
  
  if (options.dryRun) {
    return {
      wineId: wine.id,
      wineName: wine.name,
      vineyard: wine.vineyard,
      success: true,
      source: 'vivino',
      error: 'DRY RUN - would attempt Vivino fetch'
    }
  }
  
  try {
    const imageUrl = await getVivinoWineImage(wine.name, wine.vineyard, wine.vintage)
    
    if (imageUrl) {
      await prisma.wine.update({
        where: { id: wine.id },
        data: { image: imageUrl }
      })
      return {
        wineId: wine.id,
        wineName: wine.name,
        vineyard: wine.vineyard,
        success: true,
        source: 'vivino',
        imageUrl
      }
    } else {
      return {
        wineId: wine.id,
        wineName: wine.name,
        vineyard: wine.vineyard,
        success: false,
        error: 'No image found on Vivino'
      }
    }
  } catch (error) {
    return {
      wineId: wine.id,
      wineName: wine.name,
      vineyard: wine.vineyard,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage()
    return
  }
  
  const options = parseArgs()
  const startTime = Date.now()
  
  console.log('\n🍷 Wine Image Batch Fetcher\n')
  console.log(`Configuration:`)
  console.log(`  • Limit: ${options.limit} wines`)
  console.log(`  • Delay: ${options.delay}ms between requests`)
  console.log(`  • Dry run: ${options.dryRun ? 'Yes (no changes will be made)' : 'No'}`)
  console.log(`  • Force re-fetch: ${options.force ? 'Yes' : 'No'}`)
  if (options.vineyard) console.log(`  • Vineyard filter: ${options.vineyard}`)
  console.log('')
  
  // Build query
  const whereClause: {
    image?: null | { not: null }
    vineyard?: { contains: string }
    id?: string
  } = {}
  
  if (options.wineId) {
    whereClause.id = options.wineId
  } else if (!options.force) {
    whereClause.image = null
  }
  
  if (options.vineyard) {
    whereClause.vineyard = { contains: options.vineyard }
  }
  
  // Fetch wines
  const wines = await prisma.wine.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      vineyard: true,
      vintage: true,
      image: true,
    },
    orderBy: { name: 'asc' },
    take: options.limit
  })
  
  if (wines.length === 0) {
    console.log('✅ No wines found matching criteria. All wines may already have images!')
    return
  }
  
  console.log(`📋 Found ${wines.length} wine(s) to process\n`)
  
  // Process wines
  const results: FetchResult[] = []
  
  for (let i = 0; i < wines.length; i++) {
    const wine = wines[i]
    const progress = progressBar(i + 1, wines.length)
    const wineDesc = `${wine.vineyard} ${wine.name}${wine.vintage ? ` ${wine.vintage}` : ''}`
    
    console.log(`\n${progress} [${i + 1}/${wines.length}]`)
    console.log(`🍷 ${wineDesc}`)
    
    const result = await fetchWineImage(wine, options)
    results.push(result)
    
    if (result.success) {
      if (result.source === 'override') {
        console.log(`   ✅ Found manual override`)
      } else if (result.source === 'vivino') {
        console.log(`   ✅ Found on Vivino`)
      }
      if (result.imageUrl) {
        console.log(`   📷 ${result.imageUrl.substring(0, 60)}...`)
      }
    } else {
      if (result.source === 'skipped') {
        console.log(`   ⏭️  Skipped (already has image)`)
      } else {
        console.log(`   ❌ ${result.error}`)
      }
    }
    
    // Delay between requests (except for last one)
    if (i < wines.length - 1 && !options.dryRun && result.source !== 'skipped') {
      await new Promise(resolve => setTimeout(resolve, options.delay))
    }
  }
  
  // Summary
  const elapsed = Date.now() - startTime
  const successful = results.filter(r => r.success && r.source !== 'skipped')
  const failed = results.filter(r => !r.success && r.source !== 'skipped')
  const skipped = results.filter(r => r.source === 'skipped')
  const fromVivino = results.filter(r => r.source === 'vivino')
  const fromOverride = results.filter(r => r.source === 'override')
  
  console.log('\n' + '═'.repeat(50))
  console.log('📊 Summary')
  console.log('═'.repeat(50))
  console.log(`  Total processed:  ${wines.length}`)
  console.log(`  ✅ Successful:    ${successful.length}`)
  console.log(`     • From Vivino: ${fromVivino.length}`)
  console.log(`     • From Override: ${fromOverride.length}`)
  console.log(`  ❌ Failed:        ${failed.length}`)
  console.log(`  ⏭️  Skipped:       ${skipped.length}`)
  console.log(`  ⏱️  Duration:      ${formatDuration(elapsed)}`)
  
  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database')
  }
  
  // List failed wines for easy retry
  if (failed.length > 0 && failed.length <= 20) {
    console.log('\n❌ Failed wines (consider adding manual overrides):')
    for (const result of failed) {
      console.log(`   • ${result.vineyard} ${result.wineName}`)
      console.log(`     ID: ${result.wineId}`)
    }
    console.log('\nTo add manual overrides:')
    console.log('  npx tsx scripts/add-wine-image-override.ts --id <wine-id> --url "https://..."')
  }
  
  console.log('\n')
}

main()
  .catch(async (error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
