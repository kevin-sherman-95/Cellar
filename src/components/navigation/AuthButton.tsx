'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function AuthButton() {
  const { data: session, status } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  if (status === 'loading') {
    return (
      <div className="h-8 w-20 bg-cellar-200 dark:bg-gray-700 animate-pulse rounded"></div>
    )
  }

  if (session?.user) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center space-x-2 text-white hover:text-cellar-200 focus:outline-none"
        >
          <div className="w-8 h-8 shrink-0 bg-cellar-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white uppercase">
              {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
            </span>
          </div>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border dark:border-gray-700">
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-cellar-700 dark:text-gray-200 hover:bg-cellar-50 dark:hover:bg-gray-700"
              onClick={() => setIsMenuOpen(false)}
            >
              My Profile
            </Link>
            <Link
              href="/my-wines"
              className="block px-4 py-2 text-sm text-cellar-700 dark:text-gray-200 hover:bg-cellar-50 dark:hover:bg-gray-700"
              onClick={() => setIsMenuOpen(false)}
            >
              My Cellar
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2 text-sm text-cellar-700 dark:text-gray-200 hover:bg-cellar-50 dark:hover:bg-gray-700"
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>
            <hr className="my-1 dark:border-gray-700" />
            <button
              onClick={() => {
                setIsMenuOpen(false)
                signOut({ callbackUrl: '/' })
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href="/auth/signin"
      className="bg-cellar-600 hover:bg-cellar-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
    >
      Sign In
    </Link>
  )
}
