'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ChannelMemberPreview } from '@/types/channels'

export default function ChannelMembersList({ channelId }: { channelId: string }) {
  const [members, setMembers] = useState<ChannelMemberPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchMembers = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/channels/${channelId}/members`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load channel members')
        }

        const data: { members: ChannelMemberPreview[] } = await response.json()
        setMembers(data.members)
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load channel members')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void fetchMembers()

    return () => controller.abort()
  }, [channelId])

  if (loading) {
    return <div className="text-sm text-gray-500">Loading members...</div>
  }

  if (error) {
    return <div className="text-sm text-rose-300">{error}</div>
  }

  if (members.length === 0) {
    return <div className="text-sm text-gray-500">No members yet.</div>
  }

  return (
    <div className="space-y-2">
      {members.map((member) =>
        member.href ? (
          <Link
            key={member.id}
            href={member.href}
            className="block rounded-md border border-gray-700 bg-gray-950/40 px-3 py-2 transition hover:bg-gray-950/60"
          >
            <div className="text-sm text-white">{member.name}</div>
            <div className="text-xs text-gray-500">{member.subtitle}</div>
          </Link>
        ) : (
          <div key={member.id} className="rounded-md border border-gray-700 bg-gray-950/40 px-3 py-2">
            <div className="text-sm text-white">{member.name}</div>
            <div className="text-xs text-gray-500">{member.subtitle}</div>
          </div>
        )
      )}
    </div>
  )
}
