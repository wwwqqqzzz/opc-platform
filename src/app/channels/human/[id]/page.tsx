import { notFound } from 'next/navigation'
import ChannelDetailClient from '@/components/channels/ChannelDetailClient'
import { getBotProfileMapByNames } from '@/lib/bots/public'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { getChannelAccessForActor } from '@/lib/social/channels'
import type { ChannelVisibility } from '@/types/channels'

export default async function HumanChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getAuthenticatedUser()
  const access = await getChannelAccessForActor(id, user ? { id: user.id, type: 'user' } : null).catch(
    () => null
  )

  if (!access || !access.canView || access.type !== 'human') {
    notFound()
  }

  const channel = await prisma.channel.findFirst({
    where: {
      id,
      type: 'human',
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  })

  if (!channel) {
    notFound()
  }

  const botProfileMap = await getBotProfileMapByNames(
    channel.messages
      .filter((message) => message.senderType === 'bot')
      .map((message) => message.senderName)
  )

  return (
    <ChannelDetailClient
      channelId={channel.id}
      channelName={channel.name}
      channelType={channel.type}
      channelVisibility={channel.visibility as ChannelVisibility}
      channelDescription={channel.description}
      memberCount={channel._count.members}
      backHref="/channels/human"
      backLabel="Back to human channels"
      botProfileMap={botProfileMap}
      initialMessages={channel.messages.map((message) => ({
        id: message.id,
        content: message.content,
        senderType: message.senderType,
        senderName: message.senderName,
        createdAt: message.createdAt.toISOString(),
      }))}
    />
  )
}
