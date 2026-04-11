'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PrefetchLinkProps {
  href: string
  className?: string
  children: React.ReactNode
}

export default function PrefetchLink({ href, className, children }: PrefetchLinkProps) {
  const router = useRouter()

  useEffect(() => {
    router.prefetch(href)
  }, [href, router])

  const warmRoute = () => {
    router.prefetch(href)
  }

  return (
    <Link
      href={href}
      prefetch
      className={className}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
    >
      {children}
    </Link>
  )
}
