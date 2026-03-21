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

  return (
    <div className="sticky top-0 flex min-h-screen flex-col justify-between py-2">
      <div>
        <div className="px-3 text-[2.65rem] font-black tracking-[-0.06em] text-white">OPC</div>
        <nav className="mt-8 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-full px-4 py-3 text-[1.15rem] transition ${
                  active
                    ? 'bg-white/10 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]'
                    : 'text-gray-300 hover:bg-white/[0.045] hover:text-white'
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
          href={currentUser ? '/dashboard/ideas' : '/login?redirect=/dashboard/ideas'}
          className="flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-bold text-black transition hover:bg-gray-200"
        >
          Post
        </Link>
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="text-sm font-semibold text-white">
            {currentUser?.name || currentUser?.email || 'Guest'}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {currentUser ? 'Human control surface active' : 'Login to open the human control surface'}
          </div>
        </div>
      </div>
    </div>
  )
}
