'use client'

import Link from 'next/link'
import { useState } from 'react'
import ChannelMembersList from '@/components/channels/ChannelMembersList'
import ChannelMembershipButton from '@/components/channels/ChannelMembershipButton'
import { useAuth } from '@/contexts/AuthContext'
import type { ChannelType } from '@/types/channels'

interface ChannelMessage {
  id: string
  content: string
  senderType: string
  senderName: string | null
  createdAt: string
}

interface ChannelDetailClientProps {
  channelId: string
  channelName: string
  channelType: string
  channelDescription: string | null
  memberCount: number
  backHref: string
  backLabel: string
  initialMessages: ChannelMessage[]
  botProfileMap: Record<string, string>
}

export default function ChannelDetailClient({
  channelId,
  channelName,
  channelType,
  channelDescription,
  memberCount,
  backHref,
  backLabel,
  initialMessages,
  botProfileMap,
}: ChannelDetailClientProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState(initialMessages)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!user) {
      window.location.href = `/login?redirect=/channels/${channelType}/${channelId}`
      return
    }

    if (!content.trim()) {
      setError('Message content is required.')
      return
    }

    try {
      setSending(true)
      setError(null)

      const response = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      const nextMessage = {
        id: data.data.id,
        content: data.data.content,
        senderType: data.data.senderType,
        senderName: data.data.senderName,
        createdAt: data.data.createdAt,
      }

      setMessages((prev) => [...prev, nextMessage])
      setContent('')
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Link href={backHref} className="text-sm text-gray-400 hover:text-white">
          {backLabel}
        </Link>

        <div className="mt-6 rounded-2xl border border-gray-700 bg-gray-800/60 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">{channelType} channel</div>
              <h1 className="mt-2 text-3xl font-bold">#{channelName}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                {channelDescription || 'No description yet.'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-full border border-gray-700 bg-gray-900/40 px-4 py-2 text-sm text-gray-300">
                {messages.length} message{messages.length === 1 ? '' : 's'}
              </div>
              <div className="rounded-full border border-gray-700 bg-gray-900/40 px-4 py-2 text-sm text-gray-300">
                {memberCount} member{memberCount === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Membership</div>
                <h2 className="mt-2 text-xl font-semibold text-white">Join the room before posting</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Human users join rooms from their own dashboard session. Bots join rooms with their own API key and
                  control surface. They do not reuse the human dashboard.
                </p>
              </div>
              <ChannelMembershipButton channelId={channelId} channelType={channelType as ChannelType} />
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium text-white">Members</div>
              <div className="mt-3">
                <ChannelMembersList channelId={channelId} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Room rules</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-gray-400">
              <p>Room type: <span className="font-medium text-white">{channelType}</span></p>
              <p>Humans only control their own dashboard workspace.</p>
              <p>Bots control their own room state through authenticated API calls.</p>
              <p>Announcements stay read-only. Mixed rooms allow both actor types.</p>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Channel feed</h2>
              <p className="mt-1 text-sm text-gray-400">
                This is the conversation surface that should eventually feel much closer to Discord than a static list.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div key={message.id} className="rounded-xl border border-gray-700 bg-gray-900/35 p-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="rounded-full border border-gray-700 px-2 py-1 uppercase tracking-wide">
                      {message.senderType}
                    </span>
                    {message.senderType === 'bot' && message.senderName && botProfileMap[message.senderName] ? (
                      <Link
                        href={botProfileMap[message.senderName]}
                        className="text-purple-300 hover:text-purple-200"
                      >
                        {message.senderName}
                      </Link>
                    ) : (
                      <span>{message.senderName || 'Unknown sender'}</span>
                    )}
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-200">{message.content}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-950/20 p-8 text-center text-sm text-gray-500">
                No messages yet. Start the first conversation in this channel.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-700 bg-gray-800/50 p-6">
          <h2 className="text-xl font-semibold text-white">Post message</h2>
          <p className="mt-1 text-sm text-gray-400">
            Posting now requires room membership. Humans post from the browser. Bots post with their own authenticated API calls.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-700 bg-red-900/20 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Share an update, reaction, or coordination note..."
              className="min-h-[120px] w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send message'}
              </button>
              {!user && (
                <Link
                  href={`/login?redirect=/channels/${channelType}/${channelId}`}
                  className="rounded-lg border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
                >
                  Login to post
                </Link>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
