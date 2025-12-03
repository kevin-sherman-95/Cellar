'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const errors: Record<string, string> = {
  configuration: 'There is a problem with the server configuration.',
  accessdenied: 'You do not have permission to sign in.',
  verification: 'The verification token has expired or has already been used.',
  default: 'Unable to sign in.',
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'default'
  const errorMessage = errors[error.toLowerCase()] || errors.default

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-serif font-bold text-cellar-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-cellar-600">
            {errorMessage}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8 text-center space-y-4">
          <p className="text-cellar-700">
            Please try signing in again, or contact support if the problem persists.
          </p>
          
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white wine-gradient hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wine-500"
            >
              Try Again
            </Link>
            
            <Link
              href="/"
              className="w-full flex justify-center py-3 px-4 border border-cellar-300 rounded-md shadow-sm text-sm font-medium text-cellar-700 bg-white hover:bg-cellar-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wine-500"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
