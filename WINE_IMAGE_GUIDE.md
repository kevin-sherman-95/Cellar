# Wine Image Guide

This guide explains how to get actual wine bottle images displayed on wine cards throughout the app.

## How It Works

The wine image system uses a **hybrid approach** with multiple sources, tried in order:

1. **Manual Overrides** - JSON file for specific wines (highest priority)
2. **Vivino Scraping** - Automatic fetching of product photos
3. **Unsplash API** - Aesthetic wine photos as fallback
4. **Varietal Placeholders** - Generic red/white wine images (lowest priority)

Images are cached to the database after fetching, so subsequent loads are instant.

## Quick Start

### Step 1: Run the Batch Image Fetcher

This will automatically fetch images from Vivino for wines that don't have one:

```bash
# Fetch images for up to 50 wines
npx tsx scripts/fetch-wine-images-from-vivino.ts

# See what would be fetched (dry run)
npx tsx scripts/fetch-wine-images-from-vivino.ts --dry-run

# Process more wines with longer delay
npx tsx scripts/fetch-wine-images-from-vivino.ts --limit 100 --delay 2000
```

### Step 2: Add Manual Overrides for Missing Wines

For wines that Vivino can't find, add manual overrides:

```bash
# See which wines are missing images
npx tsx scripts/add-wine-image-override.ts --missing

# Add an override by wine ID
npx tsx scripts/add-wine-image-override.ts --id <wine-id> --url "https://images.vivino.com/..."

# Add an override by wine name
npx tsx scripts/add-wine-image-override.ts \
  --name "Cabernet Sauvignon" \
  --vineyard "Opus One" \
  --url "https://images.vivino.com/..."
```

### Step 3 (Optional): Configure Unsplash Fallback

For aesthetic fallback images when Vivino fails:

1. Get a free API key at [unsplash.com/developers](https://unsplash.com/developers)
2. Add to `.env.local`:
   ```env
   UNSPLASH_ACCESS_KEY=your_key_here
   ```
3. Restart the dev server

## Detailed Guide

### Automatic Vivino Fetching

When a wine card is displayed without an image, the system automatically:
1. Checks for manual overrides
2. Searches Vivino using multiple strategies (vineyard+name, name+vintage, etc.)
3. Extracts the bottle image from Vivino's response
4. Caches it to the database

This happens in the background - no action needed!

### Batch Fetcher Options

```bash
npx tsx scripts/fetch-wine-images-from-vivino.ts [options]

Options:
  --id <wine-id>       Fetch for a specific wine
  --limit <number>     Max wines to process (default: 50)
  --delay <ms>         Delay between requests (default: 1500ms)
  --dry-run            Preview without making changes
  --vineyard <name>    Only process wines from this vineyard
  --force              Re-fetch even if wine has an image
  --help               Show help
```

Examples:
```bash
# Process wines from a specific vineyard
npx tsx scripts/fetch-wine-images-from-vivino.ts --vineyard "Opus One"

# Re-fetch all images (useful if old images are broken)
npx tsx scripts/fetch-wine-images-from-vivino.ts --force --limit 200
```

### Manual Override System

Manual overrides are stored in `data/wine-image-overrides.json`:

```json
{
  "overrides": [
    {
      "name": "Cabernet Sauvignon",
      "vineyard": "Opus One",
      "vintage": 2019,
      "imageUrl": "https://images.vivino.com/thumbs/..."
    }
  ]
}
```

You can edit this file directly or use the helper script.

### Finding Image URLs

**Best Source: Vivino**
1. Go to [vivino.com](https://www.vivino.com)
2. Search for the wine
3. Right-click the bottle image → "Copy image address"
4. URLs look like: `https://images.vivino.com/thumbs/XYZ_pb_x600.png`

**Alternative Sources:**
- Winery websites
- Wine.com, Total Wine, etc.
- Google Images (search for "[wine name] bottle")

**Tips:**
- Use direct image URLs (ending in `.jpg`, `.png`, `.webp`)
- Vivino's CDN URLs are most reliable
- Avoid images that require login to access

### Hosting Images Locally

If external URLs don't work (CORS issues), host images locally:

1. Create `/public/wine-images/` directory
2. Save images there with descriptive names
3. Reference as `/wine-images/filename.jpg`

```json
{
  "name": "Black Diamond Cabernet Sauvignon",
  "vineyard": "Pine Ridge Vineyards",
  "imageUrl": "/wine-images/pine-ridge-black-diamond.jpg"
}
```

## Troubleshooting

### Images Not Loading

1. **Check the console** for error messages
2. **Verify the URL** is accessible (try opening it in a browser)
3. **Check for CORS issues** - some sites block hotlinking
4. **Run the batch fetcher** to try re-fetching:
   ```bash
   npx tsx scripts/fetch-wine-images-from-vivino.ts --force --id <wine-id>
   ```

### Vivino Rate Limiting

If you're hitting rate limits:
- Increase the `--delay` option (e.g., `--delay 3000`)
- Process fewer wines at a time (e.g., `--limit 20`)
- Wait a few minutes between batches

### Still Getting Generic Images

1. Check if the wine exists in `data/wine-image-overrides.json`
2. Add a manual override with a known-good image URL
3. Clear the wine's cached image in the database:
   ```sql
   UPDATE wines SET image = NULL WHERE id = 'wine-id';
   ```

## API Endpoint

The wine image API can be called directly:

```
GET /api/wines/[id]/image
```

Response:
```json
{
  "image": "https://images.vivino.com/...",
  "cached": true,
  "source": "vivino"
}
```

## Files Reference

| File | Purpose |
|------|---------|
| `data/wine-image-overrides.json` | Manual image overrides (edit this!) |
| `src/lib/vivino-image-fetcher.ts` | Vivino scraping logic |
| `src/lib/wine-image-mapping.ts` | Override loading and matching |
| `src/lib/wine-image-server.ts` | Main image fetching orchestrator |
| `src/lib/wine-image-utils.ts` | Client-side utilities and placeholders |
| `scripts/fetch-wine-images-from-vivino.ts` | Batch fetcher script |
| `scripts/add-wine-image-override.ts` | Override helper script |
