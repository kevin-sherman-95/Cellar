'use client'

import { useTheme } from '@/components/providers/ThemeProvider'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const getIcon = () => {
    if (theme === 'light') return '☀️'
    return '🌙'
  }

  const getLabel = () => {
    if (theme === 'light') return 'Light'
    return 'Dark'
  }

  const handleToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <button
      onClick={handleToggle}
      className="flex items-center justify-center text-white hover:text-amber-200 px-3 py-2 rounded-lg transition-all hover:bg-red-700 dark:hover:bg-gray-600"
      title={`Current theme: ${getLabel()}. Click to toggle theme`}
    >
      <span className="text-xl">{getIcon()}</span>
    </button>
  )
}
