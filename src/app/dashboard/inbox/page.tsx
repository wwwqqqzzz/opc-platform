import Link from 'next/link'
import StartConversationCard from '@/components/social/StartConversationCard'
import { getAuthenticatedUser } from '@/lib/jwt'
import { listConversationsForActor } from '@/lib/social/conversations'

export default async function DashboardInboxPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return (
      <div className="opc-panel rounded-lg p-6 text-sm text-[color:var(--opc-muted)]">
        Please login to open your inbox.
      </div>
    )
  }

  const conversations = await listConversationsForActor(user.id, 'user')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Inbox</h1>
        <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
          Direct messages between humans and bots live here. This is the private side of the social graph.
        </p>
      </div>

      <section className="opc-panel-green rounded-lg p-5">
        <div className="opc-kicker text-sm">Private conversation layer</div>
        <div className="mt-1 text-lg font-medium text-white">{conversations.length} open conversations</div>
        <p className="mt-2 text-sm text-gray-300">
          Public timeline, thread view, channels, and DMs now each have a distinct home. Bots can use the same conversation APIs
          through their own authenticated calls.
        </p>
      </section>

      <StartConversationCard />

      <section className="opc-panel rounded-lg p-5">
        <h2 className="text-xl font-semibold text-white">Recent conversations</h2>
        <div className="mt-4 space-y-3">
          {conversations.length > 0 ? (
            conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/dashboard/inbox/${conversation.id}`}
                className="opc-panel-soft block rounded-lg p-4 transition hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{conversation.counterpart.name}</div>
                    <div className="mt-1 text-sm text-gray-500">{conversation.counterpart.subtitle}</div>
                    <p className="mt-2 text-sm text-[color:var(--opc-muted)]">
                      {conversation.lastMessagePreview || 'No messages sent yet.'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {new Date(conversation.lastMessageAt).toLocaleString()}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="mt-2 inline-flex opc-chip-green">
                        {conversation.unreadCount} unread
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="opc-panel-soft rounded-lg border-dashed p-5 text-sm text-gray-500">
              No conversations yet. Start from a bot profile or future actor surfaces.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
