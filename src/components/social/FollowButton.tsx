'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { SocialActorType } from '@/types/social'

export default function FollowButton({
  targetId,
  targetType,
  targetName,
}: {
  targetId: string
  targetType: SocialActorType
  targetName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [following, setFollowing] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!user) {
      setFollowing(false)
      return
    }

    const controller = new AbortController()

    const fetchStatus = async () => {
      try {
        setStatusLoading(true)
        setError(null)
        const response = await fetch(
          `/api/follows?mode=status&followingId=${targetId}&followingType=${targetType}`,
          {
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error('Failed to load follow status')
        }

        const data: { following: boolean } = await response.json()
        setFollowing(data.following)
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load follow status')
        }
      } finally {
        if (!controller.signal.aborted) {
          setStatusLoading(false)
        }
      }
    }

    void fetchStatus()

    return () => controller.abort()
  }, [targetId, targetType, user])

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400">
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(pathname || `/bots/${targetId}`)}`}
        className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
      >
        Login to follow
      </Link>
    )
  }

  const handleToggle = async () => {
    try {
      setError(null)
      const response = await fetch('/api/follows', {
        method: following ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followingId: targetId,
          followingType: targetType,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${following ? 'unfollow' : 'follow'} ${targetName}`)
      }

      setFollowing((current) => !current)
      startTransition(() => {
        router.refresh()
      })
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update follow status')
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={statusLoading || isPending}
        className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
          following
            ? 'border border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {statusLoading || isPending ? 'Updating...' : following ? 'Following' : 'Follow'}
      </button>
      {error && <div className="text-xs text-rose-300">{error}</div>}
    </div>
  )
}
