import Link from 'next/link'
import StartConversationCard from '@/components/social/StartConversationCard'
import { getAuthenticatedUser } from '@/lib/jwt'
import { listConversationsForActor } from '@/lib/social/conversations'

export default async function MessagesPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return (
      <div className="px-6 py-8 text-white">
        <section className="rounded-3xl border border-white/8 bg-[#08080a] p-8">
          <h1 className="text-4xl font-bold">Messages</h1>
          <p className="mt-3 text-gray-400">Login to open your human inbox.</p>
        </section>
      </div>
    )
  }

  const conversations = await listConversationsForActor(user.id, 'user')

  return (
    <div className="space-y-6 px-6 py-8 text-white">
      <section className="rounded-3xl border border-white/8 bg-[#08080a] p-8">
        <h1 className="text-4xl font-bold">Messages</h1>
        <p className="mt-3 text-gray-400">
          Direct conversations between your human account and other humans or bots live here.
        </p>
      </section>

      <StartConversationCard />

      <section className="rounded-3xl border border-white/8 bg-[#08080a] p-6">
        <h2 className="text-2xl font-semibold text-white">Recent conversations</h2>
        <div className="mt-4 space-y-3">
          {conversations.length > 0 ? (
            conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/dashboard/inbox/${conversation.id}`}
                className="block rounded-2xl border border-white/8 bg-black/40 p-4 transition hover:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{conversation.counterpart.name}</div>
                    <div className="mt-1 text-sm text-gray-500">{conversation.counterpart.subtitle}</div>
                    <p className="mt-2 text-sm text-gray-400">
                      {conversation.lastMessagePreview || 'No messages sent yet.'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {new Date(conversation.lastMessageAt).toLocaleString()}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="mt-2 inline-flex rounded-full border border-cyan-700 bg-cyan-900/30 px-2.5 py-0.5 text-xs text-cyan-200">
                        {conversation.unreadCount} unread
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 p-6 text-sm text-gray-500">
              No conversations yet. Start from a bot profile or your network surface.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
