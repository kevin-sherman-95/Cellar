import Link from 'next/link'
import { getRandomFeaturedWines } from '@/lib/wine-actions'
import { getWineBottlePlaceholder } from '@/lib/wine-image-utils'

export default async function Home() {

  const featuredWines = await getRandomFeaturedWines(3)

  const fallbackWines = [
    { name: 'Château Margaux 2015', region: 'Bordeaux, France', vintage: 2015, averageRating: 4.8 },
    { name: 'Dom Pérignon 2012', region: 'Champagne, France', vintage: 2012, averageRating: 4.7 },
    { name: 'Opus One 2018', region: 'Napa Valley, USA', vintage: 2018, averageRating: 4.6 }
  ]

  const displayWines = (featuredWines.length > 0 ? featuredWines : fallbackWines).map((wine: any) => ({
    id: wine.id as string | undefined,
    name: wine.name as string,
    region: wine.region as string,
    vintage: wine.vintage as number | null | undefined,
    rating: typeof wine.averageRating === 'number' && wine.averageRating > 0
      ? Number(wine.averageRating.toFixed(1))
      : undefined,
  }))

  return (
    <div className="min-h-screen">
      {/* Hero Section with Background */}
      <section className="relative bg-gradient-to-br from-red-600 via-red-500 to-amber-500 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 text-white py-20 mb-0">
        <div className="absolute inset-0 bg-black bg-opacity-20 dark:bg-black dark:bg-opacity-40"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6">
            <img 
              src="/cellar-logo.png" 
              alt="Cellar" 
              width={256} 
              height={256} 
              className="mx-auto object-contain logo-transparent"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-4 text-shadow-lg">
            Cellar
          </h1>
          <div className="text-2xl md:text-3xl font-serif italic mb-8 text-amber-200">
Your Personal Wine Sanctuary
          </div>
          <p className="text-xl md:text-2xl mb-10 max-w-4xl mx-auto leading-relaxed">
            Discover exceptional wines, share your tasting experiences, and connect with fellow connoisseurs 
            in the world&apos;s most sophisticated wine social platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center ml-4">
            <Link
              href="/my-wines"
              className="bg-white text-red-700 px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
            >
              <span className="flex items-center gap-3 justify-center">
                <img
                  src="/cellar-logo.png"
                  alt="Cellar logo"
                  width={32}
                  height={32}
                  className="object-contain logo-transparent transform scale-150 origin-center"
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(9%) sepia(86%) saturate(7472%) hue-rotate(353deg) brightness(65%) contrast(115%)',
                  }}
                />
                <span>Visit My Cellar</span>
              </span>
            </Link>
            <Link
              href="/wines"
              className="border-3 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-red-700 transition-all transform hover:scale-105"
            >
              🍇 Start Exploring Wines
            </Link>
          </div>
        </div>
      </section>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Featured Wines Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-12 text-center">
            🏆 Featured Wines
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayWines.map((wine, i) => (
              <div key={wine.id || i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full">
                <div className="h-52 bg-[#7b1534] dark:bg-[#7b1534] flex items-center justify-center relative">
                  <img
                    src={getWineBottlePlaceholder()}
                    alt={wine.name}
                    className="h-40 w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                  />
                  {wine.vintage && (
                    <div className="absolute top-4 right-4 bg-amber-500 dark:bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {wine.vintage}
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col h-full">
                  <h3 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    {wine.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 font-medium">
                    📍 {wine.region}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center space-x-2">
                      {wine.rating ? (
                        <>
                          <div className="flex text-yellow-500 dark:text-yellow-400 text-lg">
                            {'★'.repeat(Math.floor(wine.rating))}
                          </div>
                          <span className="font-bold text-gray-700 dark:text-gray-200">
                            {wine.rating}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          No ratings yet
                        </span>
                      )}
                    </div>
                    {wine.id ? (
                      <Link
                        href={`/wines/${wine.id}`}
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold transition-colors"
                      >
                        View Details
                      </Link>
                    ) : (
                      <button
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold transition-colors"
                        type="button"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="mb-16 text-center">
          <div className="bg-gradient-to-r from-amber-600 via-red-700 to-purple-700 rounded-3xl p-12 text-white shadow-2xl">
            <h2 className="text-5xl font-serif italic mb-6">Your Wine Sanctuary</h2>
            <p className="text-xl md:text-2xl font-light max-w-4xl mx-auto leading-relaxed">
              Every great wine deserves to be remembered and shared. 
              At Cellar, we believe in the honest sharing of wine experiences, creating a community where every 
              tasting note tells a story and every review reflects genuine passion.
            </p>
            <div className="mt-8 text-6xl">🍇✨🍷</div>
          </div>
        </section>

        {/* Community Features Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-12 text-center">
            🌟 The Cellar Experience
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-2xl p-8 text-center shadow-lg">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-xl font-serif font-bold text-gray-800 mb-3">Track Your Wines</h3>
              <p className="text-gray-700">Keep a digital cellar of wines you&apos;ve tried, want to try, and are currently tasting.</p>
            </div>
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl p-8 text-center shadow-lg">
              <div className="text-5xl mb-4">⭐</div>
              <h3 className="text-xl font-serif font-bold text-gray-800 mb-3">Rate & Review</h3>
              <p className="text-gray-700">Share your tasting notes and ratings to help others discover great wines.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-8 text-center shadow-lg">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-serif font-bold text-gray-800 mb-3">Connect & Discover</h3>
              <p className="text-gray-700">Follow wine lovers, see what they&apos;re drinking, and get personalized recommendations.</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-600 to-amber-500 rounded-2xl shadow-2xl p-8 text-center text-white">
            <div className="text-6xl mb-6">🎉</div>
            <h3 className="text-3xl font-serif font-bold mb-4">Ready to Start Your Wine Journey?</h3>
            <p className="text-xl mb-8 opacity-90">Join thousands of wine connoisseurs discovering truth in every glass</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/wines"
                className="bg-white text-red-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
              >
                🍇 Browse Wine Catalog
              </Link>
              <Link
                href="/auth/signup"
                className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-red-700 transition-all transform hover:scale-105"
              >
                📝 Create Free Account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
