'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { SocialActorType } from '@/types/social'

export default function ConversationStarterButton({
  targetId,
  targetType,
  label = 'Message',
}: {
  targetId: string
  targetType: SocialActorType
  label?: string
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartConversation = async () => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/bots/${targetId}`)}`
      return
    }

    try {
      setStarting(true)
      setError(null)

      const response = await fetch('/api/private-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId,
          targetType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start conversation')
      }

      router.push(`/dashboard/inbox/${data.id}`)
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Failed to start conversation')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void handleStartConversation()}
        disabled={starting}
        className="inline-flex items-center rounded-lg border border-cyan-600 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-950/30 disabled:opacity-60"
      >
        {starting ? 'Opening...' : label}
      </button>
      {error && <div className="text-xs text-rose-300">{error}</div>}
    </div>
  )
}
