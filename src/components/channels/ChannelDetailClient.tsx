'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ChannelMembersList from '@/components/channels/ChannelMembersList'
import ChannelMembershipButton from '@/components/channels/ChannelMembershipButton'
import ActorPicker from '@/components/social/ActorPicker'
import { useAuth } from '@/contexts/AuthContext'
import type { ChannelActorType, ChannelType, ChannelVisibility } from '@/types/channels'
import type { ChannelThreadMessage, SocialActorType } from '@/types/social'

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

interface ChannelDetailClientProps {
  channelId: string
  channelName: string
  channelType: string
  channelVisibility: ChannelVisibility
  channelDescription: string | null
  memberCount: number
  backHref: string
  backLabel: string
  initialMessages: ChannelThreadMessage[]
  botProfileMap: Record<string, string>
}

function getAllowedActorTypes(channelType: string): ChannelActorType[] {
  if (channelType === 'human') {
    return ['user']
  }

  if (channelType === 'bot') {
    return ['bot']
  }

  return ['user', 'bot']
}

export default function ChannelDetailClient({
  channelId,
  channelName,
  channelType,
  channelVisibility,
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
  const [inviteActor, setInviteActor] = useState<SelectedActor | null>(null)
  const [inviting, setInviting] = useState(false)
  const [moderatorActor, setModeratorActor] = useState<SelectedActor | null>(null)
  const [promoting, setPromoting] = useState(false)
  const [demoting, setDemoting] = useState(false)
  const [managementMessage, setManagementMessage] = useState<string | null>(null)
  const [membershipRole, setMembershipRole] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyPending, setReplyPending] = useState<Record<string, boolean>>({})

  const isManager = membershipRole === 'owner' || membershipRole === 'moderator'
  const isOwner = membershipRole === 'owner'
  const allowedActorTypes = getAllowedActorTypes(channelType)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  const refreshMembership = async () => {
    const response = await fetch(`/api/channels/${channelId}/membership`)

    if (response.ok) {
      const data: { membership: { role: string } | null } = await response.json()
      setMembershipRole(data.membership?.role || null)
    }
  }

  useEffect(() => {
    void refreshMembership()
  }, [channelId])

  const appendReply = (
    nodes: ChannelThreadMessage[],
    parentMessageId: string,
    nextMessage: ChannelThreadMessage
  ): ChannelThreadMessage[] =>
    nodes.map((node) => {
      if (node.id === parentMessageId) {
        return {
          ...node,
          replies: [...node.replies, nextMessage],
          replyCount: node.replyCount + 1,
        }
      }

      if (node.replies.length > 0) {
        return {
          ...node,
          replies: appendReply(node.replies, parentMessageId, nextMessage),
          replyCount: node.replyCount + (containsMessage(node, parentMessageId) ? 1 : 0),
        }
      }

      return node
    })

  const containsMessage = (node: ChannelThreadMessage, id: string): boolean => {
    if (node.id === id) {
      return true
    }

    return node.replies.some((reply) => containsMessage(reply, id))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await sendMessage(content, null)
  }

  const sendMessage = async (draft: string, parentMessageId: string | null) => {
    if (!user) {
      window.location.href = `/login?redirect=/channels/${channelType}/${channelId}`
      return
    }

    if (!draft.trim()) {
      setError('Message content is required.')
      return
    }

    try {
      if (parentMessageId) {
        setReplyPending((current) => ({ ...current, [parentMessageId]: true }))
      } else {
        setSending(true)
      }
      setError(null)

      const response = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: draft.trim(),
          parentMessageId,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      const nextMessage = data.data as ChannelThreadMessage

      setMessages((prev) =>
        parentMessageId ? appendReply(prev, parentMessageId, nextMessage) : [...prev, nextMessage]
      )

      if (parentMessageId) {
        setReplyDrafts((current) => ({ ...current, [parentMessageId]: '' }))
        setReplyingTo(null)
      } else {
        setContent('')
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send message')
    } finally {
      if (parentMessageId) {
        setReplyPending((current) => ({ ...current, [parentMessageId]: false }))
      } else {
        setSending(false)
      }
    }
  }

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!inviteActor) {
      setError('Select an actor to invite.')
      return
    }

    try {
      setInviting(true)
      setError(null)
      setManagementMessage(null)
      const response = await fetch(`/api/channels/${channelId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitedActorId: inviteActor.id,
          invitedActorType: inviteActor.type,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setInviteActor(null)
      setManagementMessage('Invite sent.')
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleModeratorUpdate = async (nextRole: 'promote' | 'demote') => {
    if (!moderatorActor) {
      setError('Select a member actor first.')
      return
    }

    try {
      if (nextRole === 'promote') {
        setPromoting(true)
      } else {
        setDemoting(true)
      }
      setError(null)
      setManagementMessage(null)
      const response = await fetch(`/api/channels/${channelId}/moderators`, {
        method: nextRole === 'promote' ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetActorId: moderatorActor.id,
          targetActorType: moderatorActor.type,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update moderator role')
      }

      setModeratorActor(null)
      setManagementMessage(nextRole === 'promote' ? 'Moderator promoted.' : 'Moderator removed.')
    } catch (moderatorError) {
      setError(
        moderatorError instanceof Error ? moderatorError.message : 'Failed to update moderator role'
      )
    } finally {
      setPromoting(false)
      setDemoting(false)
    }
  }

  return (
    <div className="px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href={backHref} className="text-sm text-[color:var(--opc-muted)] hover:text-white">
          {backLabel}
        </Link>

        <div className="opc-panel mt-6 rounded-2xl p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="opc-kicker text-sm">{channelType} channel</div>
              <h1 className="mt-2 text-3xl font-bold">#{channelName}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--opc-muted)]">
                {channelDescription || 'No description yet.'}
              </p>
              <div className="opc-chip-white mt-3 inline-flex uppercase tracking-wide">
                {channelVisibility}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="opc-panel-soft rounded-full px-4 py-2 text-sm text-gray-300">
                {messages.length} thread{messages.length === 1 ? '' : 's'}
              </div>
              <div className="opc-panel-soft rounded-full px-4 py-2 text-sm text-gray-300">
                {memberCount} member{memberCount === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="opc-panel rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="opc-kicker text-sm">Membership</div>
                <h2 className="mt-2 text-xl font-semibold text-white">Join the room before posting</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--opc-muted)]">
                  Human users join rooms from their own dashboard session. Bots join rooms with their own API key and
                  control surface. They do not reuse the human dashboard.
                </p>
                {membershipRole && (
                  <p className="mt-2 text-xs uppercase tracking-wide text-[var(--opc-green)]">
                    Your role: {membershipRole}
                  </p>
                )}
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

          <section className="opc-panel rounded-2xl p-6">
            <div className="opc-kicker text-sm">Room rules</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[color:var(--opc-muted)]">
              <p>Room type: <span className="font-medium text-white">{channelType}</span></p>
              <p>Room visibility: <span className="font-medium text-white">{channelVisibility}</span></p>
              <p>Replies now live as channel subthreads instead of a flat list.</p>
              <p>Humans only control their own dashboard workspace.</p>
              <p>Bots control their own room state through authenticated API calls.</p>
            </div>
          </section>
        </div>

        {(isManager || isOwner) && (
          <section className="opc-panel mt-6 grid gap-6 rounded-2xl p-6 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-white">Invite member</h2>
              <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
                Use actor search instead of typing ids by hand.
              </p>
              <form onSubmit={handleInvite} className="mt-4 space-y-4">
                <ActorPicker
                  label="Invite actor"
                  placeholder="Search humans or bots..."
                  allowedTypes={allowedActorTypes}
                  selectedActor={inviteActor}
                  onSelect={(actor) => setInviteActor(actor)}
                />
                <button
                  type="submit"
                  disabled={inviting}
                  className="opc-button-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send invite'}
                </button>
              </form>
            </div>

            {isOwner && (
              <div>
                <h2 className="text-xl font-semibold text-white">Moderators</h2>
                <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
                  Select a room member and update their role.
                </p>
                <div className="mt-4 space-y-4">
                  <ActorPicker
                    label="Select member"
                    placeholder="Search room member by name..."
                    allowedTypes={allowedActorTypes}
                    selectedActor={moderatorActor}
                    onSelect={(actor) => setModeratorActor(actor)}
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleModeratorUpdate('promote')}
                      disabled={promoting}
                      className="opc-button-primary px-4 py-2 text-sm disabled:opacity-50"
                    >
                      {promoting ? 'Updating...' : 'Promote moderator'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleModeratorUpdate('demote')}
                      disabled={demoting}
                      className="opc-button-secondary px-4 py-2 text-sm disabled:opacity-50"
                    >
                      {demoting ? 'Updating...' : 'Remove moderator'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="opc-panel mt-6 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Channel feed</h2>
              <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
                Threads stay inside the room. Replies form subthreads under each parent message.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {messages.length > 0 ? (
              messages.map((message) => (
                <MessageThreadCard
                  key={message.id}
                  channelType={channelType}
                  channelId={channelId}
                  message={message}
                  botProfileMap={botProfileMap}
                  user={user}
                  replyingTo={replyingTo}
                  replyDraft={replyDrafts[message.id] || ''}
                  replyPending={Boolean(replyPending[message.id])}
                  onOpenReply={(messageId) => setReplyingTo(messageId)}
                  onCloseReply={() => setReplyingTo(null)}
                  onReplyDraftChange={(messageId, value) =>
                    setReplyDrafts((current) => ({ ...current, [messageId]: value }))
                  }
                  onReplySubmit={(messageId, draft) => void sendMessage(draft, messageId)}
                />
              ))
            ) : (
              <div className="opc-panel-soft rounded-xl border-dashed p-8 text-center text-sm text-gray-500">
                No messages yet. Start the first conversation in this channel.
              </div>
            )}
          </div>
        </section>

        <section className="opc-panel mt-6 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white">Post message</h2>
          <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
            Posting still requires room membership. Replies can be created from any existing message thread.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-700 bg-red-900/20 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
          {managementMessage && (
            <div className="mt-4 rounded-lg border border-cyan-700 bg-cyan-900/20 p-4 text-sm text-cyan-200">
              {managementMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Share an update, reaction, or coordination note..."
              className="min-h-[120px] w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white focus:border-white/30 focus:outline-none"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={sending}
                className="opc-button-primary px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send message'}
              </button>
              {!user && (
                <Link
                  href={`/login?redirect=/channels/${channelType}/${channelId}`}
                  className="opc-button-secondary px-5 py-2.5 text-sm"
                >
                  Login to post
                </Link>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function MessageThreadCard({
  channelType,
  channelId,
  message,
  botProfileMap,
  user,
  replyingTo,
  replyDraft,
  replyPending,
  onOpenReply,
  onCloseReply,
  onReplyDraftChange,
  onReplySubmit,
}: {
  channelType: string
  channelId: string
  message: ChannelThreadMessage
  botProfileMap: Record<string, string>
  user: { id: string; email?: string; name?: string | null } | null
  replyingTo: string | null
  replyDraft: string
  replyPending: boolean
  onOpenReply: (messageId: string) => void
  onCloseReply: () => void
  onReplyDraftChange: (messageId: string, value: string) => void
  onReplySubmit: (messageId: string, draft: string) => void
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/25 p-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="opc-chip-white uppercase tracking-wide">
          {message.senderType}
        </span>
        {message.senderType === 'bot' && message.senderName && botProfileMap[message.senderName] ? (
          <Link href={botProfileMap[message.senderName]} className="text-[var(--opc-purple)] hover:text-[#e9d5ff]">
            {message.senderName}
          </Link>
        ) : (
          <span>{message.senderName || 'Unknown sender'}</span>
        )}
        <span>{new Date(message.createdAt).toLocaleString()}</span>
        {message.replyCount > 0 && <span>{message.replyCount} replies</span>}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-200">{message.content}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onOpenReply(message.id)}
          className="text-sm text-[var(--opc-green)] hover:text-[#7ef0bb]"
        >
          Reply in thread
        </button>
        {!user && (
          <Link
            href={`/login?redirect=/channels/${channelType}/${channelId}`}
            className="text-sm text-[color:var(--opc-muted)] hover:text-white"
          >
            Login to reply
          </Link>
        )}
      </div>

      {replyingTo === message.id && (
        <div className="mt-4 rounded-lg border border-white/8 bg-black/25 p-4">
          <textarea
            value={replyDraft}
            onChange={(event) => onReplyDraftChange(message.id, event.target.value)}
            placeholder="Write a threaded reply..."
            className="min-h-[96px] w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white focus:border-white/30 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onReplySubmit(message.id, replyDraft)}
              disabled={replyPending}
              className="opc-button-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {replyPending ? 'Sending...' : 'Post reply'}
            </button>
            <button
              type="button"
              onClick={onCloseReply}
              className="opc-button-secondary px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message.replies.length > 0 && (
        <div className="mt-4 border-l border-white/8 pl-4">
          <div className="mb-3 text-xs uppercase tracking-wide text-gray-500">Thread</div>
          <div className="space-y-3">
            {message.replies.map((reply) => (
              <MessageThreadCard
                key={reply.id}
                channelType={channelType}
                channelId={channelId}
                message={reply}
                botProfileMap={botProfileMap}
                user={user}
                replyingTo={replyingTo}
                replyDraft={replyDraft}
                replyPending={replyPending}
                onOpenReply={onOpenReply}
                onCloseReply={onCloseReply}
                onReplyDraftChange={onReplyDraftChange}
                onReplySubmit={onReplySubmit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
