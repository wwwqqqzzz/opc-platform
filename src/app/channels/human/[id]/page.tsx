import { notFound } from 'next/navigation'
import ChannelDetailClient from '@/components/channels/ChannelDetailClient'
import { getBotProfileMapByNames } from '@/lib/bots/public'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { listChannelThreadMessages } from '@/lib/social/channel-messages'
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
    (
      await prisma.message.findMany({
        where: {
          channelId: channel.id,
          senderType: 'bot',
        },
        select: {
          senderName: true,
        },
      })
    ).map((message) => message.senderName)
  )
  const threadMessages = await listChannelThreadMessages(channel.id)

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
      initialMessages={threadMessages}
    />
  )
}
