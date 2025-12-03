'use client'

import { useState, useEffect } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Tab = 'signin' | 'signup'

interface AuthTabsProps {
  defaultTab?: Tab
}

export default function AuthTabs({ defaultTab = 'signin' }: AuthTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)
  const [providers, setProviders] = useState<any>(null)
  const router = useRouter()

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signInLoading, setSignInLoading] = useState(false)
  const [signInMessage, setSignInMessage] = useState('')

  // Sign Up state
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpName, setSignUpName] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('')
  const [signUpLoading, setSignUpLoading] = useState(false)
  const [signUpMessage, setSignUpMessage] = useState('')

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    fetchProviders()
  }, [])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    // Reset messages when switching tabs
    setSignInMessage('')
    setSignUpMessage('')
  }

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignInLoading(true)
    setSignInMessage('')

    try {
      const result = await signIn('credentials', {
        email: signInEmail,
        password: signInPassword,
        redirect: false,
      })

      if (result?.error) {
        setSignInMessage('Invalid email or password. Please try again.')
      } else if (result?.ok) {
        setSignInMessage('Sign in successful! Redirecting...')
        router.push('/')
      }
    } catch (error) {
      setSignInMessage('An error occurred. Please try again.')
    } finally {
      setSignInLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpLoading(true)
    setSignUpMessage('')

    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpMessage('Passwords do not match.')
      setSignUpLoading(false)
      return
    }

    if (signUpPassword.length < 6) {
      setSignUpMessage('Password must be at least 6 characters long.')
      setSignUpLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signUpEmail,
          name: signUpName,
          password: signUpPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSignUpMessage('Account created successfully! Signing you in...')
        // Auto sign in after successful registration
        const result = await signIn('credentials', {
          email: signUpEmail,
          password: signUpPassword,
          redirect: false,
        })

        if (result?.ok) {
          router.push('/')
        }
      } else {
        setSignUpMessage(data.error || 'An error occurred during registration.')
      }
    } catch (error) {
      setSignUpMessage('An error occurred. Please try again.')
    } finally {
      setSignUpLoading(false)
    }
  }

  const handleProviderSignIn = (provider: string) => {
    signIn(provider, { callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-serif font-bold text-cellar-900">
            {activeTab === 'signin' ? 'Welcome Back to Cellar' : 'Join Cellar'}
          </h2>
          <p className="mt-2 text-center text-sm text-cellar-600">
            {activeTab === 'signin'
              ? 'Sign in to continue your wine journey'
              : 'Start your wine discovery journey today'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-cellar-200">
            <button
              onClick={() => handleTabChange('signin')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'signin'
                  ? 'text-wine-600 border-b-2 border-wine-600 bg-wine-50'
                  : 'text-cellar-500 hover:text-cellar-700 hover:bg-cellar-50'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleTabChange('signup')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'text-wine-600 border-b-2 border-wine-600 bg-wine-50'
                  : 'text-cellar-500 hover:text-cellar-700 hover:bg-cellar-50'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-8 space-y-6">
            {activeTab === 'signin' ? (
              /* Sign In Form */
              <>
                {providers?.credentials && (
                  <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                    <div>
                      <label htmlFor="signin-email" className="block text-sm font-medium text-cellar-700">
                        Email Address
                      </label>
                      <input
                        id="signin-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-cellar-300 rounded-md shadow-sm focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                        placeholder="your@email.com"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="signin-password" className="block text-sm font-medium text-cellar-700">
                        Password
                      </label>
                      <input
                        id="signin-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-cellar-300 rounded-md shadow-sm focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                        placeholder="Enter your password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={signInLoading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white wine-gradient hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wine-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {signInLoading ? 'Signing in...' : 'Sign In'}
                    </button>

                    {signInMessage && (
                      <p className={`text-sm text-center ${signInMessage.includes('Invalid') || signInMessage.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                        {signInMessage}
                      </p>
                    )}
                  </form>
                )}
              </>
            ) : (
              /* Sign Up Form */
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-medium text-cellar-700">
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-cellar-300 rounded-md shadow-sm focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                    placeholder="Your full name"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-cellar-700">
                    Email Address
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-cellar-300 rounded-md shadow-sm focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                    placeholder="your@email.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-cellar-700">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-cellar-300 rounded-md shadow-sm focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                    placeholder="Choose a password (min 6 characters)"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-cellar-700">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-cellar-300 rounded-md shadow-sm focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                    placeholder="Confirm your password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={signUpLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white wine-gradient hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wine-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signUpLoading ? 'Creating Account...' : 'Create Account'}
                </button>

                {signUpMessage && (
                  <p className={`text-sm text-center ${signUpMessage.includes('Error') || signUpMessage.includes('not match') || signUpMessage.includes('must be') ? 'text-red-600' : 'text-green-600'}`}>
                    {signUpMessage}
                  </p>
                )}
              </form>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-cellar-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-cellar-500">Or continue with</span>
              </div>
            </div>

            {/* Social Sign In */}
            <div className="space-y-3">
              {providers?.google && (
                <button
                  onClick={() => handleProviderSignIn('google')}
                  className="w-full flex items-center justify-center px-4 py-3 border border-cellar-300 rounded-md shadow-sm text-sm font-medium text-cellar-700 bg-white hover:bg-cellar-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wine-500"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              )}

              {providers?.github && (
                <button
                  onClick={() => handleProviderSignIn('github')}
                  className="w-full flex items-center justify-center px-4 py-3 border border-cellar-300 rounded-md shadow-sm text-sm font-medium text-cellar-700 bg-white hover:bg-cellar-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wine-500"
                >
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </button>
              )}
            </div>

            {activeTab === 'signup' && (
              <div className="text-xs text-cellar-500 text-center">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




