# 🚀 Quick Setup Instructions for Cellar

I've prepared your wine social platform! Here's exactly what you need to run to get it started:

## Step 1: Install Dependencies
Open Terminal in your project folder and run:
```bash
cd /Users/ksherman/Testproject/Cellar
npm install
```

## Step 2: Set Up Database (PostgreSQL with Neon)

1. **Create a Neon account and database:**
   - Go to [neon.tech](https://neon.tech) and sign up for a free account
   - Create a new project (choose a name and region)
   - Copy the connection string from the dashboard

2. **Add DATABASE_URL to `.env.local`:**
   ```bash
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   ```
   (Replace with your actual Neon connection string)

3. **Generate Prisma client and run migrations:**
   ```bash
   npm run db:generate
   npx prisma migrate dev --name init
   npm run db:seed
   ```

## Step 3: Start Your App! 🍷
```bash
npm run dev
```

## Step 4: Open in Browser
Go to: **http://localhost:3000**

---

## ✅ What I've Already Set Up For You:
- ✅ Complete project structure
- ✅ All code files and components  
- ✅ Database schema configured for PostgreSQL
- ✅ Beautiful wine-cellar inspired design

## 📝 Note:
You'll need to create a `.env.local` file with your `DATABASE_URL` from Neon before running the app.

## 🎯 What You'll See:
- Elegant homepage with wine discovery
- Complete authentication system
- Wine catalog with search & filters
- User profiles and collections
- Review system with star ratings
- Social features and activity feeds

## 💡 If You Get Errors:
1. Make sure you're in the right directory: `/Users/ksherman/Testproject/Cellar`
2. If port 3000 is busy, try: `npm run dev -- -p 3001`
3. If database issues, the app will still show the beautiful UI with sample data

Your wine social platform is ready to go! 🍾
