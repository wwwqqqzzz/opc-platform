import { notFound } from 'next/navigation'
import PrivateConversationClient from '@/components/social/PrivateConversationClient'
import { getAuthenticatedUser } from '@/lib/jwt'
import { getConversationForActor, listConversationMessages } from '@/lib/social/conversations'

export default async function DashboardConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthenticatedUser()

  if (!user) {
    notFound()
  }

  const { id } = await params
  const conversationResult = await getConversationForActor(id, { id: user.id, type: 'user' })

  if (!conversationResult) {
    notFound()
  }

  const messages = await listConversationMessages(id, { id: user.id, type: 'user' })

  return (
    <PrivateConversationClient
      conversationId={id}
      initialMessages={messages}
      summary={conversationResult.summary}
    />
  )
}
