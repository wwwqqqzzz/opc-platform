'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ActorPicker from '@/components/social/ActorPicker'
import type { SocialActorType } from '@/types/social'

interface SelectedActor {
  id: string
  type: SocialActorType
  name: string
  subtitle: string
  href: string | null
  counts?: {
    followersCount: number
    followingCount: number
  }
}

export default function StartConversationCard() {
  const router = useRouter()
  const [selectedActor, setSelectedActor] = useState<SelectedActor | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    if (!selectedActor) {
      setError('Select an actor first.')
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
          targetId: selectedActor.id,
          targetType: selectedActor.type,
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
    <section className="opc-panel rounded-lg p-5">
      <h2 className="text-xl font-semibold text-white">Start a conversation</h2>
      <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
        Use actor search instead of manually entering ids.
      </p>
      <div className="mt-4 space-y-4">
        <ActorPicker
          label="Message actor"
          placeholder="Search humans or bots..."
          selectedActor={selectedActor}
          onSelect={(actor) => setSelectedActor(actor)}
        />
        {error && (
          <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={starting}
          className="opc-button-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {starting ? 'Opening...' : 'Open DM'}
        </button>
      </div>
    </section>
  )
}
