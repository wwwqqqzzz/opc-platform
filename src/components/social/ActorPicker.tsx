'use client'

import { useEffect, useState } from 'react'
import type { SocialActorType, SocialRelationStatus } from '@/types/social'

interface ActorOption {
  id: string
  type: SocialActorType
  name: string
  subtitle: string
  href: string | null
  counts?: {
    followersCount: number
    followingCount: number
  }
  relation?: SocialRelationStatus | null
}

export default function ActorPicker({
  label,
  placeholder,
  allowedTypes,
  selectedActor,
  onSelect,
}: {
  label: string
  placeholder: string
  allowedTypes?: SocialActorType[]
  selectedActor: ActorOption | null
  onSelect: (actor: ActorOption | null) => void
}) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<ActorOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setItems([])
      return
    }

    const controller = new AbortController()

    const fetchActors = async () => {
      try {
        setLoading(true)
        setError(null)
        const typeQuery =
          allowedTypes && allowedTypes.length === 1 ? `&type=${allowedTypes[0]}` : ''
        const response = await fetch(
          `/api/social/actors?q=${encodeURIComponent(query.trim())}${typeQuery}`,
          { signal: controller.signal }
        )

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to search actors')
        }

        setItems(data.items || [])
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to search actors')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void fetchActors()

    return () => controller.abort()
  }, [allowedTypes, query])

  return (
    <div className="space-y-3">
      <label className="block text-sm text-[color:var(--opc-muted)]">{label}</label>
      {selectedActor ? (
        <div className="opc-panel-soft rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-white">{selectedActor.name}</div>
              <div className="text-sm text-[color:var(--opc-muted)]">{selectedActor.subtitle}</div>
              {selectedActor.counts && (
                <div className="mt-1 text-xs text-gray-500">
                  {selectedActor.counts.followersCount} followers · {selectedActor.counts.followingCount} following
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-xs text-[var(--opc-green)] hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
          />
          {loading && <div className="text-xs text-gray-500">Searching actors...</div>}
          {error && <div className="text-xs text-rose-300">{error}</div>}
          {items.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-white/8 bg-black/25 p-2">
              {items.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => {
                    onSelect(item)
                    setQuery('')
                    setItems([])
                  }}
                  className="block w-full rounded-md border border-white/8 bg-black/25 px-3 py-3 text-left transition hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{item.name}</div>
                      <div className="text-sm text-[color:var(--opc-muted)]">{item.subtitle}</div>
                      {item.relation?.blockedByTarget && (
                        <div className="mt-1 text-xs text-rose-300">Blocked by this actor</div>
                      )}
                      {item.relation?.blocked && (
                        <div className="mt-1 text-xs text-amber-300">You already blocked this actor</div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>{item.type}</div>
                      {item.counts && <div>{item.counts.followersCount} followers</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
