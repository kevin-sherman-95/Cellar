# Neon Database Connection Troubleshooting

## Current Issue
Prisma can't connect to your Neon database. Let's check a few things:

## Step-by-Step Verification

### Step 1: Check Neon Dashboard
1. **Open:** https://console.neon.tech
2. **Log in** to your account
3. **Find your project** (should be named something like "neondb" or similar)

### Step 2: Verify Database Status
Look for your project and check:
- [ ] Is the project status "Active" or "Running"?
- [ ] If it says "Paused" or "Suspended", click the "Resume" button
- [ ] Wait 30-60 seconds for it to fully start

### Step 3: Get Fresh Connection String
1. Click on your project
2. Look for **"Connection Details"** or **"Connection String"** section
3. You should see connection strings - copy the **"Direct"** one (not pooled)
4. It should look like:
   ```
   postgresql://neondb_owner:password@ep-xxxxx.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### Step 4: Common Issues & Solutions

**Issue 1: Database is Paused**
- **Solution:** Resume it in the dashboard (free tier databases pause after inactivity)

**Issue 2: Wrong Connection String**
- **Solution:** Make sure you're using the "Direct" connection for migrations
- The pooler connection (with "-pooler" in the URL) is for your app, not migrations

**Issue 3: Network/Firewall**
- **Solution:** Try from a different network, or check if your firewall blocks port 5432

**Issue 4: Connection String Format**
- **Solution:** Make sure there are no extra spaces or characters
- Should start with `postgresql://` not `psql 'postgresql://`

### Step 5: Test Connection
Once you have the correct connection string, we'll update the `.env` file and test again.

---

## What to Do Next

1. **Check your Neon dashboard** (steps above)
2. **Get a fresh "Direct" connection string**
3. **Share it with me** and I'll help you update the files
4. **Or** if the database was paused, resume it and we'll try again

---

## Quick Test Commands

After updating your connection string, we'll run:
```bash
# Test the connection
npx prisma migrate dev --name init_postgresql

# If that works, your database is set up!
```
