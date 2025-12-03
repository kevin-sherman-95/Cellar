# Unsplash Wine Image Integration Setup

This guide explains how to enable Unsplash as a fallback image source for wine bottles.

## Overview

The wine image system uses a priority-based approach:

1. **Manual Overrides** - `data/wine-image-overrides.json` (highest priority)
2. **Vivino Scraping** - Actual product photos from Vivino
3. **Unsplash API** - Aesthetic wine photos as fallback
4. **Varietal Placeholders** - Generic red/white wine images (lowest priority)

Unsplash provides high-quality, free-to-use wine photography that serves as a nice fallback when specific product images aren't available.

## Setup Instructions

### Step 1: Get an Unsplash API Key (Free)

1. Go to [Unsplash Developers](https://unsplash.com/developers)
2. Sign up or log in to your Unsplash account
3. Click "New Application"
4. Fill in the application details:
   - Application name: "Cellar Wine App"
   - Description: "Wine collection management app"
   - Accept the API use and guidelines
5. Copy your **Access Key** (also called Client ID)

### Step 2: Add API Key to Environment

Create or edit `.env.local` in your project root:

```env
# Unsplash API for fallback wine images
# Free tier: 50 requests/hour
# Get your key at: https://unsplash.com/developers
UNSPLASH_ACCESS_KEY=your_access_key_here
```

### Step 3: Restart Development Server

```bash
npm run dev
```

## Rate Limits

| Plan | Requests | Notes |
|------|----------|-------|
| Demo/Dev | 50/hour | Good for development |
| Production | Higher limits | Apply for production access |

The implementation minimizes API calls by:
- Caching found images to the database
- Using Vivino as the primary source
- Batching requests (10 wines at a time)

## How It Works

### Image Fetching Flow

```
Wine Card Displayed
       ↓
Check database for cached image
       ↓ (no image)
Check manual overrides (JSON file)
       ↓ (no override)
Try Vivino scraping
       ↓ (not found)
Try Unsplash API (if configured)
       ↓ (not found or not configured)
Use varietal placeholder
```

### Search Queries

Unsplash searches are optimized by wine type:
- **Red wines**: "red wine bottle dark", "cabernet wine bottle"
- **White wines**: "white wine bottle chardonnay", "sauvignon blanc bottle"
- **Rosé**: "rose wine bottle pink"
- **Sparkling**: "champagne bottle", "prosecco bottle"

## API Endpoint

**GET** `/api/wines/[id]/image`

Response:
```json
{
  "image": "https://images.unsplash.com/...",
  "cached": true,
  "source": "unsplash"
}
```

## Troubleshooting

### Images Still Show Placeholders

1. **Check API Key**: Ensure `UNSPLASH_ACCESS_KEY` is set correctly
2. **Restart Server**: Environment changes require restart
3. **Check Rate Limits**: Wait if you've exceeded 50 requests/hour
4. **Check Console**: Look for error messages in server logs

### Recommended: Improve Success Rate

For best results, use the hybrid approach:

1. Run the Vivino batch script first:
   ```bash
   npx tsx scripts/fetch-wine-images-from-vivino.ts
   ```

2. Add manual overrides for important wines that fail:
   ```bash
   npx tsx scripts/add-wine-image-override.ts --missing
   ```

## Without Unsplash

The app works fine without Unsplash configured:
- Vivino scraping still attempts to find product images
- Manual overrides always work
- Varietal-based placeholders provide fallback

Unsplash is just an additional fallback layer for aesthetic images.
