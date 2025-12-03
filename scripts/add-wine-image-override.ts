/**
 * Helper script to add wine image overrides
 * Copyright Anysphere Inc.
 * 
 * Usage:
 *   npx tsx scripts/add-wine-image-override.ts --name "Wine Name" --vineyard "Vineyard" --url "https://..."
 *   npx tsx scripts/add-wine-image-override.ts --id <wine-id> --url "https://..."
 *   npx tsx scripts/add-wine-image-override.ts --list
 *   npx tsx scripts/add-wine-image-override.ts --missing
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface WineImageOverride {
  name: string
  vineyard: string
  vintage?: number
  imageUrl: string
  _note?: string
}

interface OverridesFile {
  _description: string
  _instructions: string[]
  overrides: WineImageOverride[]
}

const OVERRIDES_PATH = path.join(process.cwd(), 'data', 'wine-image-overrides.json')

function loadOverrides(): OverridesFile {
  if (!fs.existsSync(OVERRIDES_PATH)) {
    return {
      _description: 'Manual wine image overrides',
      _instructions: [],
      overrides: []
    }
  }
  return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf-8'))
}

function saveOverrides(data: OverridesFile): void {
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(data, null, 2))
}

async function addOverride(
  name: string,
  vineyard: string,
  imageUrl: string,
  vintage?: number
): Promise<void> {
  const data = loadOverrides()
  
  // Check if override already exists
  const existingIndex = data.overrides.findIndex(
    o => o.name.toLowerCase() === name.toLowerCase() &&
         o.vineyard.toLowerCase() === vineyard.toLowerCase() &&
         o.vintage === vintage
  )
  
  const newOverride: WineImageOverride = {
    name,
    vineyard,
    imageUrl,
    ...(vintage && { vintage })
  }
  
  if (existingIndex >= 0) {
    data.overrides[existingIndex] = newOverride
    console.log(`✅ Updated existing override for: ${vineyard} ${name}${vintage ? ` ${vintage}` : ''}`)
  } else {
    data.overrides.push(newOverride)
    console.log(`✅ Added new override for: ${vineyard} ${name}${vintage ? ` ${vintage}` : ''}`)
  }
  
  saveOverrides(data)
  console.log(`   Image URL: ${imageUrl}`)
  console.log(`\n📁 Saved to: ${OVERRIDES_PATH}`)
}

async function addOverrideById(wineId: string, imageUrl: string): Promise<void> {
  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    select: { id: true, name: true, vineyard: true, vintage: true }
  })
  
  if (!wine) {
    console.error(`❌ Wine not found with ID: ${wineId}`)
    process.exit(1)
  }
  
  await addOverride(wine.name, wine.vineyard, imageUrl, wine.vintage || undefined)
  
  // Also update the database directly
  await prisma.wine.update({
    where: { id: wineId },
    data: { image: imageUrl }
  })
  console.log(`\n📦 Also updated database directly for immediate effect`)
}

async function listOverrides(): Promise<void> {
  const data = loadOverrides()
  
  console.log('\n📋 Wine Image Overrides\n')
  console.log(`Found ${data.overrides.length} override(s):\n`)
  
  for (const override of data.overrides) {
    console.log(`  • ${override.vineyard} - ${override.name}${override.vintage ? ` (${override.vintage})` : ''}`)
    console.log(`    ${override.imageUrl.substring(0, 60)}...`)
  }
  
  console.log(`\n📁 File: ${OVERRIDES_PATH}`)
}

async function listMissingImages(): Promise<void> {
  const winesWithoutImages = await prisma.wine.findMany({
    where: { image: null },
    select: { id: true, name: true, vineyard: true, vintage: true },
    orderBy: { name: 'asc' },
    take: 50
  })
  
  console.log('\n🔍 Wines Missing Images\n')
  console.log(`Found ${winesWithoutImages.length} wine(s) without images:\n`)
  
  for (const wine of winesWithoutImages) {
    console.log(`  ID: ${wine.id}`)
    console.log(`  Name: ${wine.vineyard} ${wine.name}${wine.vintage ? ` ${wine.vintage}` : ''}`)
    console.log('')
  }
  
  console.log('\nTo add an image override, run:')
  console.log('  npx tsx scripts/add-wine-image-override.ts --id <wine-id> --url "https://..."')
}

function printUsage(): void {
  console.log(`
Wine Image Override Tool
========================

Usage:
  Add by wine details:
    npx tsx scripts/add-wine-image-override.ts \\
      --name "Cabernet Sauvignon" \\
      --vineyard "Opus One" \\
      --vintage 2019 \\
      --url "https://images.vivino.com/..."

  Add by wine ID (recommended):
    npx tsx scripts/add-wine-image-override.ts --id <wine-id> --url "https://..."

  List all overrides:
    npx tsx scripts/add-wine-image-override.ts --list

  Show wines missing images:
    npx tsx scripts/add-wine-image-override.ts --missing

Options:
  --name      Wine name
  --vineyard  Vineyard/winery name
  --vintage   Vintage year (optional)
  --url       Image URL
  --id        Wine ID from database
  --list      List all current overrides
  --missing   Show wines that need images
  --help      Show this help message

Tips for finding image URLs:
  1. Search for the wine on Vivino (vivino.com)
  2. Right-click the bottle image → "Copy image address"
  3. URLs should look like: https://images.vivino.com/thumbs/...
  `)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage()
    return
  }
  
  if (args.includes('--list')) {
    await listOverrides()
    return
  }
  
  if (args.includes('--missing')) {
    await listMissingImages()
    return
  }
  
  // Parse arguments
  const getArg = (flag: string): string | undefined => {
    const index = args.indexOf(flag)
    return index >= 0 && args[index + 1] ? args[index + 1] : undefined
  }
  
  const url = getArg('--url')
  const id = getArg('--id')
  const name = getArg('--name')
  const vineyard = getArg('--vineyard')
  const vintageStr = getArg('--vintage')
  const vintage = vintageStr ? parseInt(vintageStr, 10) : undefined
  
  if (!url) {
    console.error('❌ --url is required')
    printUsage()
    process.exit(1)
  }
  
  if (id) {
    await addOverrideById(id, url)
  } else if (name && vineyard) {
    await addOverride(name, vineyard, url, vintage)
  } else {
    console.error('❌ Either --id or both --name and --vineyard are required')
    printUsage()
    process.exit(1)
  }
  
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error('Error:', error)
  await prisma.$disconnect()
  process.exit(1)
})
