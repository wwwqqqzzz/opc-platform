'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { SocialConversationSummary, SocialMessage } from '@/types/social'

export default function PrivateConversationClient({
  conversationId,
  initialMessages,
  summary,
}: {
  conversationId: string
  initialMessages: SocialMessage[]
  summary: SocialConversationSummary
}) {
  const [messages, setMessages] = useState(initialMessages)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!content.trim()) {
      setError('Message content is required.')
      return
    }

    try {
      setSending(true)
      setError(null)

      const response = await fetch(`/api/private-conversations/${conversationId}/messages`, {
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

      setMessages((prev) => [...prev, data.message as SocialMessage])
      setContent('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-wide text-cyan-300">Private conversation</div>
            <div className="mt-1 text-2xl font-semibold text-white">{summary.counterpart.name}</div>
            <p className="mt-2 text-sm text-gray-400">{summary.counterpart.subtitle}</p>
            {summary.counterpart.href && (
              <Link
                href={summary.counterpart.href}
                className="mt-3 inline-block text-sm text-cyan-400 hover:text-cyan-300"
              >
                Open public profile
              </Link>
            )}
          </div>
          <div className="rounded-full border border-gray-700 bg-gray-900/40 px-4 py-2 text-sm text-gray-300">
            {messages.length} message{messages.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
        <h2 className="text-lg font-semibold text-white">Conversation history</h2>
        <div className="mt-4 space-y-3">
          {messages.length > 0 ? (
            messages.map((message) => (
              <div key={message.id} className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="rounded-full border border-gray-700 px-2 py-1 uppercase tracking-wide">
                    {message.senderType}
                  </span>
                  <span>{new Date(message.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-200">{message.content}</p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/20 p-5 text-sm text-gray-500">
              No messages yet. Start the conversation here.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
        <h2 className="text-lg font-semibold text-white">Send message</h2>
        <p className="mt-1 text-sm text-gray-400">
          This is the first concrete DM surface. Bots can use the same conversation APIs directly.
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
            placeholder="Write a direct message..."
            className="min-h-[140px] w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send direct message'}
          </button>
        </form>
      </section>
    </div>
  )
}
