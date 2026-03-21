import { prisma } from '@/lib/prisma'
import { getSocialActorPreview } from '@/lib/social/follows'
import { shouldSuppressNotifications } from '@/lib/social/relations'
import type { SocialActorType, SocialNotification } from '@/types/social'

interface ActorIdentity {
  id: string
  type: SocialActorType
}

interface NotificationInput {
  actorId: string
  actorType: SocialActorType
  type: string
  title: string
  body?: string | null
  href?: string | null
  metadata?: string | null
}

const MENTION_PATTERN = /@([a-zA-Z0-9._-]+)/g

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      actorId: input.actorId,
      actorType: input.actorType,
      type: input.type,
      title: input.title,
      body: input.body || null,
      href: input.href || null,
      metadata: input.metadata || null,
    },
  })
}

export async function listNotificationsForActor(
  actorId: string,
  actorType: SocialActorType,
  limit = 50,
  options: {
    unreadOnly?: boolean
    type?: string
  } = {}
): Promise<SocialNotification[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      actorId,
      actorType,
      ...(options.unreadOnly ? { readAt: null } : {}),
      ...(options.type ? { type: options.type } : {}),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: Math.min(limit, 100),
  })

  return notifications.map((notification) => ({
    id: notification.id,
    actorId: notification.actorId,
    actorType: notification.actorType as SocialActorType,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    metadata: notification.metadata,
    readAt: notification.readAt?.toISOString() || null,
    createdAt: notification.createdAt.toISOString(),
  }))
}

export async function markNotificationRead(id: string, actor: ActorIdentity) {
  return prisma.notification.updateMany({
    where: {
      id,
      actorId: actor.id,
      actorType: actor.type,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  })
}

export async function markAllNotificationsRead(actor: ActorIdentity) {
  return prisma.notification.updateMany({
    where: {
      actorId: actor.id,
      actorType: actor.type,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  })
}

export function extractMentionHandles(content: string) {
  const handles = new Set<string>()

  for (const match of content.matchAll(MENTION_PATTERN)) {
    if (match[1]) {
      handles.add(match[1].trim().toLowerCase())
    }
  }

  return Array.from(handles)
}

export async function createMentionNotifications(options: {
  content: string
  href: string
  sender: ActorIdentity
  title: string
  body: string
}) {
  const handles = extractMentionHandles(options.content)

  if (handles.length === 0) {
    return
  }

  const [users, bots, senderPreview] = await Promise.all([
    prisma.user.findMany({
      where: {
        name: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.bot.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    }),
    getSocialActorPreview(options.sender.id, options.sender.type),
  ])

  const senderName = senderPreview?.name || 'Someone'
  const normalizedHandleSet = new Set(handles)
  const matchedUsers = users.filter((user) => user.name && normalizedHandleSet.has(user.name.toLowerCase()))
  const matchedBots = bots.filter((bot) => normalizedHandleSet.has(bot.name.toLowerCase()))

  await Promise.all([
    ...matchedUsers
      .filter((user) => !(user.id === options.sender.id && options.sender.type === 'user'))
      .map(async (user) => {
        if (
          await shouldSuppressNotifications(
            { id: user.id, type: 'user' },
            options.sender
          )
        ) {
          return null
        }

        return createNotification({
          actorId: user.id,
          actorType: 'user',
          type: 'channel_mention',
          title: `${senderName} mentioned you`,
          body: options.body,
          href: options.href,
          metadata: options.title,
        })
      }),
    ...matchedBots
      .filter((bot) => !(bot.id === options.sender.id && options.sender.type === 'bot'))
      .map(async (bot) => {
        if (
          await shouldSuppressNotifications(
            { id: bot.id, type: 'bot' },
            options.sender
          )
        ) {
          return null
        }

        return createNotification({
          actorId: bot.id,
          actorType: 'bot',
          type: 'channel_mention',
          title: `${senderName} mentioned you`,
          body: options.body,
          href: options.href,
          metadata: options.title,
        })
      }),
  ])
}

export async function createDmNotification(options: {
  recipient: ActorIdentity
  sender: ActorIdentity
  conversationId: string
  content: string
}) {
  const senderPreview = await getSocialActorPreview(options.sender.id, options.sender.type)
  const senderName = senderPreview?.name || 'Someone'

  if (await shouldSuppressNotifications(options.recipient, options.sender)) {
    return null
  }

  return createNotification({
    actorId: options.recipient.id,
    actorType: options.recipient.type,
    type: 'dm_message',
    title: `${senderName} sent you a DM`,
    body: options.content.slice(0, 160),
    href: `/dashboard/inbox/${options.conversationId}`,
    metadata: null,
  })
}
