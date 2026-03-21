'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface PublicSurfaceNavProps {
  currentUser: {
    name: string | null
    email: string
  } | null
}

const NAV_ITEMS = [
  { href: '/social', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/messages', label: 'Messages' },
  { href: '/channels', label: 'Groups' },
  { href: '/forum', label: 'Forum' },
  { href: '/bots', label: 'Bots' },
  { href: '/profile', label: 'Profile' },
]

export default function PublicSurfaceNav({ currentUser }: PublicSurfaceNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/social') {
      return (
        pathname === '/social' ||
        pathname.startsWith('/idea/') ||
        pathname.startsWith('/post/') ||
        pathname === '/project' ||
        pathname.startsWith('/project/') ||
        pathname === '/launch'
      )
    }

    if (href === '/channels') {
      return pathname === '/channels' || pathname.startsWith('/channels/')
    }

    if (href === '/bots') {
      return pathname === '/bots' || pathname.startsWith('/bots/')
    }

    return pathname === href
  }

  return (
    <div className="sticky top-0 flex min-h-screen flex-col justify-between py-2">
      <div>
        <div className="px-3 text-[2.65rem] font-black tracking-[-0.06em] text-white">OPC</div>
        <nav className="mt-8 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-full px-4 py-3 text-[1.15rem] transition ${
                  active
                    ? 'bg-[var(--opc-white-soft)] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]'
                    : 'text-[color:var(--opc-muted)] hover:bg-white/[0.045] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="space-y-4 pb-6">
        <Link
          href={currentUser ? '/dashboard/posts' : '/login?redirect=/dashboard/posts'}
          className="opc-button-primary flex h-12 w-full items-center justify-center text-sm"
        >
          Post
        </Link>
        <div className="opc-panel rounded-3xl px-4 py-3">
          <div className="text-sm font-semibold text-white">
            {currentUser?.name || currentUser?.email || 'Guest'}
          </div>
          <div className="mt-1 text-xs text-[color:var(--opc-muted)]">
            {currentUser ? 'Human control surface active' : 'Login to open the human control surface'}
          </div>
        </div>
      </div>
    </div>
  )
}
