import { prisma } from '@/lib/prisma'
import type { ChannelActorType, ChannelMemberPreview, ChannelType } from '@/types/channels'

export function canActorJoinChannelType(actorType: ChannelActorType, channelType: ChannelType) {
  if (channelType === 'announcement') {
    return true
  }

  if (channelType === 'mixed') {
    return true
  }

  return actorType === 'user' ? channelType === 'human' : channelType === 'bot'
}

export function canActorPostInChannelType(actorType: ChannelActorType, channelType: ChannelType) {
  if (channelType === 'announcement') {
    return false
  }

  if (channelType === 'mixed') {
    return true
  }

  return actorType === 'user' ? channelType === 'human' : channelType === 'bot'
}

export async function getChannelMembership(channelId: string, actorId: string, actorType: ChannelActorType) {
  return prisma.channelMember.findUnique({
    where: {
      channelId_actorId_actorType: {
        channelId,
        actorId,
        actorType,
      },
    },
  })
}

export async function joinChannel(channelId: string, actorId: string, actorType: ChannelActorType) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      type: true,
      isActive: true,
    },
  })

  if (!channel || !channel.isActive) {
    throw new Error('Channel not found')
  }

  if (!canActorJoinChannelType(actorType, channel.type as ChannelType)) {
    throw new Error('This actor type cannot join this channel')
  }

  return prisma.channelMember.upsert({
    where: {
      channelId_actorId_actorType: {
        channelId,
        actorId,
        actorType,
      },
    },
    update: {},
    create: {
      channelId,
      actorId,
      actorType,
    },
  })
}

export async function leaveChannel(channelId: string, actorId: string, actorType: ChannelActorType) {
  await prisma.channelMember.deleteMany({
    where: {
      channelId,
      actorId,
      actorType,
    },
  })
}

export async function listChannelMembers(channelId: string, limit = 24): Promise<ChannelMemberPreview[]> {
  const members = await prisma.channelMember.findMany({
    where: {
      channelId,
    },
    orderBy: {
      joinedAt: 'desc',
    },
    take: limit,
  })

  const userIds = members.filter((member) => member.actorType === 'user').map((member) => member.actorId)
  const botIds = members.filter((member) => member.actorType === 'bot').map((member) => member.actorId)

  const [users, bots] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.bot.findMany({
      where: {
        id: {
          in: botIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isVerified: true,
      },
    }),
  ])

  const userMap = Object.fromEntries(
    users.map((user) => [
      user.id,
      {
        name: user.name || 'Human member',
        subtitle: 'Human member',
        href: null,
      },
    ])
  )
  const botMap = Object.fromEntries(
    bots.map((bot) => [
      bot.id,
      {
        name: bot.name,
        subtitle: bot.isVerified ? 'Verified bot' : 'Bot member',
        href: `/bots/${bot.id}`,
      },
    ])
  )

  return members
    .map((member) => {
      const actor = member.actorType === 'user' ? userMap[member.actorId] : botMap[member.actorId]

      if (!actor) {
        return null
      }

      return {
        id: member.id,
        actorId: member.actorId,
        actorType: member.actorType as ChannelActorType,
        name: actor.name,
        subtitle: actor.subtitle,
        href: actor.href,
        joinedAt: member.joinedAt.toISOString(),
      } satisfies ChannelMemberPreview
    })
    .filter((item): item is ChannelMemberPreview => Boolean(item))
}
