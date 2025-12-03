# Cellar - Wine Social Platform

## 🍷 Project Overview

Cellar is a comprehensive social platform for wine enthusiasts, built with modern web technologies. It combines the functionality of Goodreads with a focus on wine discovery, rating, and social interaction.

## ✨ Key Features Implemented

### 🔐 Authentication System
- **NextAuth.js** integration with multiple providers (Email, Google, GitHub)
- Secure session management
- User registration and login flows
- Protected routes and user authorization

### 🍾 Wine Catalog & Discovery
- **Comprehensive wine database** with detailed information
- **Advanced search & filtering** by varietal, region, vintage, rating
- **Individual wine detail pages** with rich information display
- **Wine collection management** (Tried, Want to Try, Currently Tasting)

### 👤 User Profiles & Collections
- **Personal profile pages** with bio, location, and statistics
- **Wine collection management** with organized tabs
- **Profile customization** through settings page
- **User statistics** and wine journey tracking

### ⭐ Rating & Review System
- **Interactive star rating** with half-star precision
- **Rich text reviews** with tasting notes
- **Photo upload capability** for wine bottles and tasting experiences
- **Review management** (create, edit, delete)

### 🤝 Social Features
- **Follow/unfollow system** to connect with other wine enthusiasts
- **Activity feeds** showing community wine activities
- **Social interactions** (likes, comments on reviews)
- **User discovery** and wine recommendation through social connections

### 🎨 Design System
- **Wine-cellar inspired aesthetic** with warm, elegant color palette
- **Responsive design** optimized for mobile and desktop
- **Custom Tailwind CSS** components and utilities
- **Smooth animations** and micro-interactions
- **Accessibility** considerations throughout

## 🏗️ Technical Architecture

### Frontend
- **Next.js 14** with App Router for modern React development
- **TypeScript** for type safety and better development experience
- **Tailwind CSS** for utility-first styling
- **Client/Server components** for optimal performance

### Backend & Database
- **PostgreSQL** database for reliable data storage
- **Prisma ORM** for type-safe database operations
- **Server actions** for seamless client-server communication
- **Comprehensive data models** for wines, users, reviews, and social features

### Authentication & Security
- **NextAuth.js** for secure authentication
- **Session management** with JWT tokens
- **Protected API routes** and middleware
- **Email verification** and social OAuth

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages (signin, signup, error)
│   ├── wines/             # Wine catalog and detail pages
│   ├── profile/           # User profile management
│   ├── my-wines/          # Personal wine collection
│   ├── search/            # Wine search functionality
│   ├── activity/          # Social activity feed
│   ├── settings/          # User account settings
│   └── users/[id]/        # Public user profiles
├── components/            # Reusable React components
│   ├── wine/              # Wine-related components
│   ├── reviews/           # Review and rating components
│   ├── social/            # Social feature components
│   ├── profile/           # Profile-related components
│   └── ui/                # Basic UI components
├── lib/                   # Utility functions and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Database connection
│   ├── actions.ts        # Server actions
│   └── types.ts          # TypeScript type definitions
└── prisma/               # Database schema and migrations
    ├── schema.prisma     # Database models
    └── seed.ts           # Sample data seeder
```

## 🎯 Core User Flows

### Wine Discovery Journey
1. **Browse Wines** → Filter by preferences → **View Details**
2. **Add to Collection** → Write Review → **Share Experience**
3. **Follow Users** → **Discover Recommendations** → Repeat

### Social Engagement Flow
1. **Create Profile** → Follow wine enthusiasts
2. **Rate & Review** wines → Engage with community reviews
3. **Activity Feed** → Discover new wines through social connections

## 🚀 Ready for Deployment

The application is fully functional and ready for deployment to platforms like:
- **Vercel** (recommended for Next.js)
- **Railway** or **PlanetScale** for PostgreSQL database
- **Cloudinary** for image storage and optimization

## 🔄 Future Enhancements (Phase 2)

- **Wine API Integration** (Vivino, Wine-Searcher)
- **Advanced Recommendations** using machine learning
- **Wine Pairing Suggestions**
- **Cellar Management Tools**
- **Wine Collection Analytics**
- **Mobile App** (React Native)
- **Wine Event Integration**
- **Professional Sommelier Features**

## 💡 Learning Outcomes

This project demonstrates mastery of:
- **Full-stack development** with modern React/Next.js
- **Database design** and ORM usage
- **Authentication** and security best practices
- **Social platform** architecture and features
- **UI/UX design** with component-based architecture
- **TypeScript** for large application development

---

**Cellar** represents a complete, production-ready social platform that successfully combines wine discovery, personal collection management, and social interaction in an elegant, user-friendly interface.
