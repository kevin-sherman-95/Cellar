# Environment Variables Quick Reference

## Required for Vercel Deployment

Copy these to **Vercel Dashboard → Settings → Environment Variables**:

### 1. DATABASE_URL
```
postgresql://user:password@host:5432/database?sslmode=require
```
**Where to get it:**
- **Vercel Postgres**: Automatically created when you add Postgres storage
- **Supabase**: Settings → Database → Connection string
- **Neon**: Dashboard → Connection string

### 2. NEXTAUTH_SECRET
```
rVZo3xeZUShn7XLhyXXN7GVIvvTuEaCH5O25lSRqDfk=
```
**What it is:** Secure random secret for encrypting NextAuth sessions

### 3. NEXTAUTH_URL
```
https://your-app-name.vercel.app
```
**What it is:** Your Vercel deployment URL (replace `your-app-name` with your actual project name)

---

## Setup Steps Summary

1. **Create PostgreSQL database** (choose one):
   - Vercel Postgres (easiest - integrated)
   - Supabase (free tier)
   - Neon (free tier)

2. **Add environment variables in Vercel:**
   - Go to your project → Settings → Environment Variables
   - Add the three variables above
   - Make sure to select all environments (Production, Preview, Development)

3. **Run database migrations:**
   ```bash
   # Set DATABASE_URL locally first
   export DATABASE_URL="your-postgres-connection-string"
   
   # Generate Prisma client
   npm run db:generate
   
   # Create and apply migrations
   npx prisma migrate dev --name init
   ```

4. **Deploy:**
   - Push your code to GitHub
   - Vercel will automatically deploy
   - Check deployment logs for any errors

---

## Troubleshooting

**Build fails?**
- Verify all 3 required environment variables are set
- Check that DATABASE_URL is accessible
- Make sure NEXTAUTH_URL matches your Vercel URL exactly

**Database connection errors?**
- Verify DATABASE_URL format is correct
- Check database is accessible (not blocked by firewall)
- Ensure SSL mode is set: `?sslmode=require`

**Authentication not working?**
- Double-check NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL has no trailing slash
- Check browser console for errors


