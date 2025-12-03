'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    avatar: ''
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    // Load current user data
    setFormData({
      name: session.user.name || '',
      bio: '',
      location: '',
      avatar: session.user.image || ''
    })
  }, [session, status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // TODO: Implement profile update API call
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      setMessage('Profile updated successfully!')
    } catch (error) {
      setMessage('Error updating profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-cellar-200 rounded mb-4 w-1/3"></div>
          <div className="h-96 bg-cellar-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return <div>Please sign in to access settings.</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-cellar-900 mb-2">
          Account Settings
        </h1>
        <p className="text-cellar-600">
          Manage your profile information and preferences
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div>
            <label className="block text-sm font-medium text-cellar-700 mb-4">
              Profile Photo
            </label>
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-wine-100 rounded-full flex items-center justify-center">
                {formData.avatar ? (
                  <img 
                    src={formData.avatar} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-wine-600">
                    {formData.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="border border-cellar-300 text-cellar-700 hover:bg-cellar-50 px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Change Photo
                </button>
                <p className="text-xs text-cellar-500 mt-1">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif font-semibold text-cellar-800 border-b border-cellar-200 pb-2">
              Basic Information
            </h3>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-cellar-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                placeholder="Your display name"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-cellar-700 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                placeholder="City, Country"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-cellar-700 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-cellar-300 rounded-md focus:outline-none focus:ring-wine-500 focus:border-wine-500"
                placeholder="Tell us about your wine journey..."
              />
              <p className="text-xs text-cellar-500 mt-1">
                {formData.bio.length}/500 characters
              </p>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif font-semibold text-cellar-800 border-b border-cellar-200 pb-2">
              Account Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-cellar-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={session.user.email || ''}
                disabled
                className="w-full px-3 py-2 border border-cellar-300 rounded-md bg-cellar-50 text-cellar-500"
              />
              <p className="text-xs text-cellar-500 mt-1">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-cellar-700 mb-1">
                Member Since
              </label>
              <input
                type="text"
                value={new Date().toLocaleDateString()}
                disabled
                className="w-full px-3 py-2 border border-cellar-300 rounded-md bg-cellar-50 text-cellar-500"
              />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif font-semibold text-cellar-800 border-b border-cellar-200 pb-2">
              Privacy Settings
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-cellar-700">
                    Public Profile
                  </label>
                  <p className="text-xs text-cellar-500">
                    Allow others to view your profile and wine collections
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-wine-600 focus:ring-wine-500 border-cellar-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-cellar-700">
                    Show Activity
                  </label>
                  <p className="text-xs text-cellar-500">
                    Display your reviews and ratings in activity feeds
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-wine-600 focus:ring-wine-500 border-cellar-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-cellar-700">
                    Email Notifications
                  </label>
                  <p className="text-xs text-cellar-500">
                    Receive notifications about follows, comments, and recommendations
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-wine-600 focus:ring-wine-500 border-cellar-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-cellar-200 flex justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-cellar-300 text-cellar-700 hover:bg-cellar-50 px-6 py-2 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="wine-gradient text-white px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-md ${
              message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            }`}>
              {message}
            </div>
          )}
        </form>

        {/* Danger Zone */}
        <div className="mt-12 pt-6 border-t border-red-200">
          <h3 className="text-lg font-serif font-semibold text-red-800 mb-4">
            Danger Zone
          </h3>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-red-800">Delete Account</h4>
                <p className="text-sm text-red-600 mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
