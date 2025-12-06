import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import AuthButton from '@/components/navigation/AuthButton'
import BrowseDropdown from '@/components/navigation/BrowseDropdown'
import SearchBar from '@/components/navigation/SearchBar'
import ThemeToggle from '@/components/ui/ThemeToggle'

export const metadata: Metadata = {
  title: 'Cellar - Your Personal Wine Sanctuary | Wine Social Platform',
  description: 'Cellar - The sophisticated wine social platform. Discover exceptional wines, share tasting experiences, and connect with fellow connoisseurs.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
        <ThemeProvider
          defaultTheme="dark"
          storageKey="cellar-theme"
        >
          <SessionProvider>
            <header className="sticky top-0 z-50 bg-gradient-to-r from-red-800 via-red-700 to-red-600 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 shadow-xl">
              <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center">
                    <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white font-serif hover:text-amber-200 transition-colors">
                      <img 
                        src="/cellar-logo.png" 
                        alt="Cellar" 
                        width={40} 
                        height={40} 
                        className="object-contain logo-transparent"
                      />
                      <span>Cellar</span>
                    </Link>
                  </div>
                  
                  {/* Desktop Navigation */}
                  <div className="hidden md:flex items-center space-x-4 flex-1 ml-8">
                    <Link href="/" className="text-white hover:text-amber-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-red-700 dark:hover:bg-gray-600 whitespace-nowrap">
                      Home
                    </Link>
                    <Link href="/my-wines" prefetch={true} className="text-white hover:text-amber-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-red-700 dark:hover:bg-gray-600 whitespace-nowrap">
                      My Cellar
                    </Link>
                    <BrowseDropdown />
                    <div className="flex-1 max-w-md">
                      <SearchBar />
                    </div>
                  </div>
                  
                  {/* Desktop Right Side */}
                  <div className="hidden md:flex items-center space-x-4">
                    <AuthButton />
                    <ThemeToggle />
                  </div>
                  
                  {/* Mobile menu */}
                  <div className="md:hidden flex items-center space-x-2">
                    <AuthButton />
                    <ThemeToggle />
                  </div>
                </div>
              </nav>
            </header>
            <main className="flex-grow">
              {children}
            </main>
            <footer className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 text-white py-12 mt-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <img 
                      src="/cellar-logo.png" 
                      alt="Cellar" 
                      width={48} 
                      height={48} 
                      className="object-contain logo-transparent"
                    />
                    <h3 className="text-2xl font-serif text-amber-200 dark:text-amber-300">Cellar</h3>
                  </div>
                  <p className="text-gray-200 dark:text-gray-300 text-lg">Your Personal Wine Sanctuary</p>
                  <p className="text-sm text-gray-300 dark:text-gray-400 mt-4">© 2024 Anysphere Inc. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
