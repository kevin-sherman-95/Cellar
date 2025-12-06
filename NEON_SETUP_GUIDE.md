# Step-by-Step Neon PostgreSQL Setup Guide

## Step 1: Verify Your Neon Account & Database

1. **Go to Neon Dashboard:**
   - Open https://console.neon.tech in your browser
   - Log in to your account

2. **Check Your Project:**
   - You should see a project (probably named something like "neondb")
   - Click on your project

3. **Verify Database Status:**
   - Make sure the database shows as "Active" or "Running"
   - If it says "Paused" or "Suspended", click to resume it

## Step 2: Get the Correct Connection String

Neon provides TWO types of connection strings:

### A. Pooler Connection (for your app - what you have now)
- Format: `...-pooler.c-3.us-east-1.aws.neon.tech...`
- Good for: Running your Next.js app
- **This is what you currently have**

### B. Direct Connection (for migrations - what we need)
- Format: `...ep-icy-salad-ahhi2m9t.c-3.us-east-1.aws.neon.tech...` (no "-pooler")
- Good for: Running Prisma migrations
- **We need this for the initial setup**

**How to get it:**
1. In Neon dashboard, click on your project
2. Look for "Connection Details" or "Connection String"
3. You should see tabs: "Pooled" and "Direct"
4. Click on "Direct" tab
5. Copy that connection string

## Step 3: Update Connection String for Migrations

Once you have the direct connection string, we'll update the `.env` file temporarily to run migrations.

## Step 4: Run Database Migrations

After updating the connection string, we'll run:
```bash
npx prisma migrate dev --name init_postgresql
```

This creates all the tables in your database.

## Step 5: Switch Back to Pooler Connection

After migrations succeed, we'll switch back to the pooler connection for running your app.

## Step 6: Start Your App

Finally, start your development server:
```bash
npm run dev
```

---

## Quick Checklist

- [ ] Neon account created and logged in
- [ ] Project is active/running
- [ ] Have both connection strings (pooler and direct)
- [ ] Migrations run successfully
- [ ] App starts without errors
