'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { ChannelType } from '@/types/channels'

export default function ChannelMembershipButton({
  channelId,
  channelType,
}: {
  channelId: string
  channelType: ChannelType
}) {
  const { user, loading } = useAuth()
  const [isMember, setIsMember] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setIsMember(false)
      return
    }

    const controller = new AbortController()

    const fetchMembership = async () => {
      try {
        setStatusLoading(true)
        setError(null)
        const response = await fetch(`/api/channels/${channelId}/membership`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load membership')
        }

        const data: { isMember: boolean } = await response.json()
        setIsMember(data.isMember)
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load membership')
        }
      } finally {
        if (!controller.signal.aborted) {
          setStatusLoading(false)
        }
      }
    }

    void fetchMembership()

    return () => controller.abort()
  }, [channelId, user])

  if (loading) {
    return <div className="text-sm text-gray-400">Loading membership...</div>
  }

  if (!user) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(`/channels/${channelType}/${channelId}`)}`}
        className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
      >
        Login to join
      </Link>
    )
  }

  const handleToggle = async () => {
    try {
      setPending(true)
      setError(null)
      const response = await fetch(`/api/channels/${channelId}/membership`, {
        method: isMember ? 'DELETE' : 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update membership')
      }

      setIsMember(!isMember)
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update membership')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={statusLoading || pending}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          isMember
            ? 'border border-gray-600 text-gray-200 hover:bg-gray-800'
            : 'bg-cyan-600 text-white hover:bg-cyan-700'
        } disabled:opacity-60`}
      >
        {statusLoading || pending ? 'Updating...' : isMember ? 'Leave room' : 'Join room'}
      </button>
      {error && <div className="text-xs text-rose-300">{error}</div>}
    </div>
  )
}
