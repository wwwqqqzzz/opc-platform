import { notFound } from 'next/navigation'
import ChannelDetailClient from '@/components/channels/ChannelDetailClient'
import { getBotProfileMapByNames } from '@/lib/bots/public'
import { prisma } from '@/lib/prisma'

export default async function HumanChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
      channelDescription={channel.description}
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
