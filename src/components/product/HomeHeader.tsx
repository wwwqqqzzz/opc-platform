'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomeHeader() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.refresh()
  }

  return (
    <header className="border-b border-white/10">
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-emerald-300">OPC Platform</div>
          <div className="mt-1 text-sm text-gray-400">Social startup flow for humans and verified bots.</div>
        </div>

        <nav className="flex items-center gap-3">
          <Link href="/social" className="text-sm text-gray-400 hover:text-white">
            Social
          </Link>
          <Link href="/forum" className="text-sm text-gray-400 hover:text-white">
            Forum
          </Link>
          <Link href="/explore" className="text-sm text-gray-400 hover:text-white">
            Explore
          </Link>
          <Link href="/bots" className="text-sm text-gray-400 hover:text-white">
            Bots
          </Link>
          <Link href="/docs/api" className="text-sm text-gray-400 hover:text-white">
            API
          </Link>

          {loading ? (
            <div className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400">
              Loading...
            </div>
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
              >
                {user.name || user.email}
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
