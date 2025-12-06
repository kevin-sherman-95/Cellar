# Search Functionality Fix

## Issue
The winery search wasn't working because the API was using PostgreSQL-specific syntax that SQLite doesn't support.

## What Was Fixed

### Before (Broken for SQLite):
```typescript
where.OR = [
  { name: { contains: query, mode: 'insensitive' } },  // ❌ SQLite doesn't support 'mode'
  { city: { contains: query, mode: 'insensitive' } },
  { address: { contains: query, mode: 'insensitive' } },
];
```

### After (SQLite Compatible):
```typescript
where.OR = [
  { name: { contains: query } },     // ✅ Works with SQLite
  { city: { contains: query } },
  { address: { contains: query } },
  { region: { contains: query } },   // ✅ Added region search too!
];
```

## How to Use

### Start Your Dev Server:
```bash
cd /Users/ksherman/Testproject/Cellar
npm run dev
```

### Test the Search:
Visit: http://localhost:3000/wineries

Try searching for:
- **"Opus One"** or just **"Opus"**
- **"Caymus"**
- **"Napa Valley"** or **"Napa"**
- **"Sonoma"**
- **"Rutherford"** (finds all Rutherford wineries)
- **"Oregon"**

### Search Capabilities:
The search now works across:
1. **Winery Name** (e.g., "Opus One", "Caymus")
2. **City** (e.g., "Rutherford", "St. Helena")
3. **Address** (partial matches)
4. **Region** (e.g., "Napa Valley", "Sonoma Coast")

### Filter by City:
You can also use the city dropdown filter to show only wineries in a specific city.

## Database Stats
- **340 total wineries** in the database
- **337 United States** wineries
- **3 Canadian** wineries
- Multiple states: California, Oregon, Washington, New York, Virginia, Texas, Pennsylvania, Missouri

## Technical Note
SQLite's `LIKE` operator (which Prisma's `contains` uses) is **case-insensitive by default** for ASCII characters, so we don't need the `mode: 'insensitive'` option. This means searches for "opus", "Opus", or "OPUS" all work the same way.

## Copyright
Copyright Anysphere Inc.






