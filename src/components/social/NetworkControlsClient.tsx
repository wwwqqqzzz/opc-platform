'use client'

import { useState } from 'react'
import ActorPicker from '@/components/social/ActorPicker'
import type { SocialConnectionPreview, SocialConnectionType, SocialActorType } from '@/types/social'

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

export default function NetworkControlsClient({
  initialIncoming,
  initialOutgoing,
}: {
  initialIncoming: SocialConnectionPreview[]
  initialOutgoing: SocialConnectionPreview[]
}) {
  const [selectedActor, setSelectedActor] = useState<SelectedActor | null>(null)
  const [connectionType, setConnectionType] = useState<SocialConnectionType>('friend')
  const [incoming, setIncoming] = useState(initialIncoming)
  const [outgoing, setOutgoing] = useState(initialOutgoing)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sendRequest = async () => {
    if (!selectedActor) {
      setError('Select an actor first.')
      return
    }

    try {
      setPending('request')
      setError(null)
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId: selectedActor.id,
          targetType: selectedActor.type,
          connectionType,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send request')
      }

      setOutgoing((current) => [
        {
          ...selectedActor,
          connectionType,
          status: 'pending',
          createdAt: new Date().toISOString(),
          respondedAt: null,
          direction: 'outgoing',
        },
        ...current.filter(
          (item) =>
            !(
              item.id === selectedActor.id &&
              item.type === selectedActor.type &&
              item.connectionType === connectionType
            )
        ),
      ])
      setSelectedActor(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to send request')
    } finally {
      setPending(null)
    }
  }

  const respond = async (connectionId: string, action: 'accept' | 'decline') => {
    try {
      setPending(connectionId)
      setError(null)
      const response = await fetch('/api/connections', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId,
          action,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to respond to request')
      }

      setIncoming((current) => current.filter((item) => item.id !== connectionId))
    } catch (respondError) {
      setError(respondError instanceof Error ? respondError.message : 'Failed to respond to request')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="opc-panel rounded-lg p-5">
        <h2 className="text-xl font-semibold text-white">Request connection</h2>
        <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
          Friend and contact requests now use actor search instead of manual ids.
        </p>
        <div className="mt-4 space-y-4">
          <ActorPicker
            label="Target actor"
            placeholder="Search humans or bots..."
            selectedActor={selectedActor}
            onSelect={(actor) => setSelectedActor(actor)}
          />
          <label className="block space-y-2">
            <span className="text-sm text-[color:var(--opc-muted)]">Connection type</span>
            <select
              value={connectionType}
              onChange={(event) => setConnectionType(event.target.value as SocialConnectionType)}
              className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
            >
              <option value="friend">friend</option>
              <option value="contact">contact</option>
            </select>
          </label>
          {error && (
            <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => void sendRequest()}
            disabled={pending === 'request'}
            className="opc-button-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending === 'request' ? 'Sending...' : 'Send request'}
          </button>
        </div>
      </section>

      <section className="opc-panel rounded-lg p-5">
        <h2 className="text-xl font-semibold text-white">Incoming requests</h2>
        <div className="mt-4 space-y-3">
          {incoming.length > 0 ? (
            incoming.map((item) => (
              <div key={item.id} className="opc-panel-soft rounded-lg p-4">
                <div className="font-medium text-white">{item.name}</div>
                <div className="mt-1 text-sm text-[color:var(--opc-muted)]">
                  {item.connectionType} request · {item.subtitle}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void respond(item.id, 'accept')}
                    disabled={pending === item.id}
                    className="opc-button-primary px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void respond(item.id, 'decline')}
                    disabled={pending === item.id}
                    className="opc-button-secondary px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="opc-panel-soft rounded-lg border-dashed p-4 text-sm text-gray-500">
              No incoming requests.
            </div>
          )}
        </div>
      </section>

      <section className="opc-panel rounded-lg p-5 xl:col-span-2">
        <h2 className="text-xl font-semibold text-white">Outgoing requests</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {outgoing.length > 0 ? (
            outgoing.map((item) => (
              <div key={item.id} className="opc-panel-soft rounded-lg p-4">
                <div className="font-medium text-white">{item.name}</div>
                <div className="mt-1 text-sm text-[color:var(--opc-muted)]">
                  {item.connectionType} request · {item.status}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Sent {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="opc-panel-soft rounded-lg border-dashed p-4 text-sm text-gray-500">
              No outgoing requests yet.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
