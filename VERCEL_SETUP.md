# Vercel Deployment Setup Guide

This guide will help you set up your Cellar app for deployment on Vercel.

## Step 1: Set Up a PostgreSQL Database

You need a PostgreSQL database for production. Here are free options:

### Option A: Vercel Postgres (Recommended - Easiest)
1. Go to your Vercel project dashboard
2. Click on the **Storage** tab
3. Click **Create Database** → Select **Postgres**
4. Choose a name and region
5. Vercel will automatically create the `DATABASE_URL` environment variable for you

### Option B: Supabase (Free Tier Available)
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Go to **Settings** → **Database**
4. Copy the **Connection string** (URI format)
5. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### Option C: Neon (Free Tier Available)
1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string from the dashboard
4. Format: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`

## Step 2: Add Environment Variables in Vercel

Go to your Vercel project → **Settings** → **Environment Variables** and add:

### Required Variables:

1. **DATABASE_URL**
   - **Value**: Your PostgreSQL connection string
   - **Environment**: Production, Preview, Development (select all)
   - Example: `postgresql://user:password@host:5432/database?sslmode=require`

2. **NEXTAUTH_SECRET**
   - **Value**: `rVZo3xeZUShn7XLhyXXN7GVIvvTuEaCH5O25lSRqDfk=`
   - **Environment**: Production, Preview, Development (select all)
   - This is a secure random secret for encrypting NextAuth sessions

3. **NEXTAUTH_URL**
   - **Value**: `https://your-app-name.vercel.app` (replace with your actual Vercel URL)
   - **Environment**: Production, Preview, Development
   - For Preview/Development, you can use: `http://localhost:3000`

### Optional Variables (for additional features):

4. **GOOGLE_CLIENT_ID** and **GOOGLE_CLIENT_SECRET**
   - Only if you want Google OAuth login
   - Get from [Google Cloud Console](https://console.cloud.google.com)

5. **GITHUB_ID** and **GITHUB_SECRET**
   - Only if you want GitHub OAuth login
   - Get from GitHub → Settings → Developer settings → OAuth Apps

6. **UNSPLASH_ACCESS_KEY**
   - Only if you want Unsplash fallback images
   - Get from [Unsplash Developers](https://unsplash.com/developers)

## Step 3: Run Database Migrations

After setting up your database, you need to run migrations. You have two options:

### Option A: Run migrations locally (Recommended)
```bash
# Make sure DATABASE_URL is set in your .env.local
npm run db:generate
npx prisma migrate deploy
```

### Option B: Run migrations via Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Link your project
vercel link

# Run migrations
vercel env pull .env.local
npx prisma migrate deploy
```

## Step 4: Deploy

1. Push your changes to GitHub
2. Vercel will automatically detect and deploy
3. Check the deployment logs for any errors

## Step 5: Verify Deployment

1. Visit your Vercel URL
2. Try signing up/logging in
3. Check that the database connection works

## Troubleshooting

### Build fails with "DATABASE_URL not found"
- Make sure you've added `DATABASE_URL` in Vercel environment variables
- Ensure it's set for the correct environment (Production/Preview)

### Build fails with Prisma errors
- Run `npm run db:generate` locally first
- Make sure your `DATABASE_URL` is correct
- Check that the database is accessible from Vercel's IP ranges

### Authentication not working
- Verify `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your Vercel deployment URL
- Check that the URL doesn't have a trailing slash

## Quick Reference

**Generated NEXTAUTH_SECRET**: `rVZo3xeZUShn7XLhyXXN7GVIvvTuEaCH5O25lSRqDfk=`

**Environment Variables Checklist:**
- [ ] DATABASE_URL (PostgreSQL connection string)
- [ ] NEXTAUTH_SECRET (use the generated one above)
- [ ] NEXTAUTH_URL (your Vercel app URL)

## Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set correctly
3. Make sure your database is accessible
4. Check that Prisma migrations have been run


