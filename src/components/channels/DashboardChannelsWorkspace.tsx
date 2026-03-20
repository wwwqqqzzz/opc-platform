'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { ChannelInvitePreview, ChannelSummary, ChannelType, ChannelVisibility } from '@/types/channels'

const CHANNEL_TYPES: ChannelType[] = ['human', 'bot', 'mixed']
const VISIBILITIES: ChannelVisibility[] = ['open', 'invite_only', 'private']

export default function DashboardChannelsWorkspace({
  initialChannels,
  initialInvites,
  actorLabel,
}: {
  initialChannels: ChannelSummary[]
  initialInvites: ChannelInvitePreview[]
  actorLabel: string
}) {
  const [channels, setChannels] = useState(initialChannels)
  const [invites, setInvites] = useState(initialInvites)
  const [creating, setCreating] = useState(false)
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'human' as ChannelType,
    visibility: 'open' as ChannelVisibility,
  })

  const grouped = {
    human: channels.filter((channel) => channel.type === 'human'),
    bot: channels.filter((channel) => channel.type === 'bot'),
    mixed: channels.filter((channel) => channel.type === 'mixed'),
    announcement: channels.filter((channel) => channel.type === 'announcement'),
  }

  const createRoom = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      setCreating(true)
      setError(null)
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room')
      }

      setChannels((current) => [data.channel, ...current])
      setForm({
        name: '',
        description: '',
        type: 'human',
        visibility: 'open',
      })
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  const respondToInvite = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      setRespondingInviteId(inviteId)
      setError(null)
      const response = await fetch(`/api/channels/invites/${inviteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to respond to invite')
      }

      const invite = invites.find((item) => item.id === inviteId)
      if (invite && action === 'accept') {
        setChannels((current) => [
          {
            id: invite.channelId,
            name: invite.channelName,
            description: null,
            type: invite.channelType,
            visibility: invite.channelVisibility,
            messageCount: 0,
            memberCount: 1,
            unreadCount: 0,
            isMember: true,
            hasPendingInvite: false,
          },
          ...current.filter((channel) => channel.id !== invite.channelId),
        ])
      }

      setInvites((current) => current.filter((item) => item.id !== inviteId))
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Failed to respond to invite')
    } finally {
      setRespondingInviteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-cyan-700/40 bg-cyan-900/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-wide text-cyan-300">Room operations</div>
            <div className="mt-1 text-lg font-medium text-white">
              {channels.length} accessible rooms for {actorLabel}
            </div>
            <p className="mt-2 text-sm text-cyan-100/80">
              Humans manage rooms here. Bots use `/api/bots/me/channels` and `/api/bots/me/conversations`.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/social"
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
            >
              Open public social feed
            </Link>
            <Link
              href="/dashboard/notifications"
              className="rounded-lg border border-cyan-600/60 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-950/30"
            >
              Open notifications
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <h2 className="text-xl font-semibold text-white">Create room</h2>
          <p className="mt-2 text-sm text-gray-400">
            Room ownership starts here. New rooms automatically assign you as owner.
          </p>

          <form onSubmit={createRoom} className="mt-4 space-y-4">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="room-name"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe what this room is for..."
              className="min-h-[120px] w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <div className="text-sm text-gray-400">Room type</div>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, type: event.target.value as ChannelType }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  {CHANNEL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <div className="text-sm text-gray-400">Visibility</div>
                <select
                  value={form.visibility}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      visibility: event.target.value as ChannelVisibility,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  {VISIBILITIES.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {visibility}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create room'}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <h2 className="text-xl font-semibold text-white">Pending invites</h2>
          <p className="mt-2 text-sm text-gray-400">
            Invite-only and private rooms enter your workspace from here.
          </p>
          <div className="mt-4 space-y-3">
            {invites.length > 0 ? (
              invites.map((invite) => (
                <div key={invite.id} className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="font-medium text-white">
                        #{invite.channelName} <span className="text-gray-500">({invite.channelType})</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-400">
                        {invite.invitedByName} invited you to a {invite.channelVisibility} room.
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(invite.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void respondToInvite(invite.id, 'accept')}
                        disabled={respondingInviteId === invite.id}
                        className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {respondingInviteId === invite.id ? 'Updating...' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void respondToInvite(invite.id, 'decline')}
                        disabled={respondingInviteId === invite.id}
                        className="rounded-lg border border-gray-600 px-3 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/20 p-4 text-sm text-gray-500">
                No pending room invites.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {(['human', 'bot', 'mixed', 'announcement'] as const).map((group) => (
          <section key={group} className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <h2 className="text-lg font-semibold capitalize text-white">{group} rooms</h2>
            <div className="mt-4 space-y-3">
              {grouped[group].length > 0 ? (
                grouped[group].map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/channels/${channel.type}/${channel.id}`}
                    className="block rounded-lg border border-gray-700 bg-gray-900/40 p-4 transition hover:bg-gray-900/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-white">#{channel.name}</div>
                      <div className="text-xs text-gray-500">{channel.visibility}</div>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">{channel.description || 'No description yet.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>{channel.messageCount} messages</span>
                      <span>{channel.memberCount} members</span>
                      <span>{channel.unreadCount || 0} unread</span>
                      {channel.isMember && <span className="text-cyan-300">Joined</span>}
                      {channel.hasPendingInvite && <span className="text-amber-300">Invite pending</span>}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/20 p-4 text-sm text-gray-500">
                  No rooms in this group yet.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
