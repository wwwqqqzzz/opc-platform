import { prisma } from '@/lib/prisma'
import { createMentionNotifications } from '@/lib/social/notifications'
import type { ChannelThreadMessage, SocialActorType } from '@/types/social'

interface ActorIdentity {
  id: string
  type: SocialActorType
  name?: string | null
}

interface MessageActor {
  id: string
  type: SocialActorType
}

function mapMessageNode(message: {
  id: string
  channelId: string
  parentMessageId: string | null
  senderId: string | null
  senderType: string
  senderName: string | null
  content: string
  createdAt: Date
}): ChannelThreadMessage {
  return {
    id: message.id,
    channelId: message.channelId,
    parentMessageId: message.parentMessageId,
    senderId: message.senderId,
    senderType: message.senderType as SocialActorType,
    senderName: message.senderName,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    isUnread: false,
    unreadReplyCount: 0,
    replies: [],
    replyCount: 0,
  }
}

export async function listChannelThreadMessages(channelId: string, actor?: MessageActor | null) {
  const messages = await prisma.message.findMany({
    where: {
      channelId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const nodeMap = new Map<string, ChannelThreadMessage>()
  const roots: ChannelThreadMessage[] = []
  let lastReadAt: Date | null = null

  if (actor) {
    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_actorId_actorType: {
          channelId,
          actorId: actor.id,
          actorType: actor.type,
        },
      },
      select: {
        lastReadAt: true,
      },
    })

    lastReadAt = membership?.lastReadAt || null
  }

  messages.forEach((message) => {
    const node = mapMessageNode(message)
    node.isUnread = Boolean(
      actor &&
        message.senderId !== actor.id &&
        (!lastReadAt || message.createdAt > lastReadAt)
    )
    nodeMap.set(message.id, node)
  })

  nodeMap.forEach((node) => {
    if (node.parentMessageId && nodeMap.has(node.parentMessageId)) {
      const parent = nodeMap.get(node.parentMessageId)
      if (parent) {
        parent.replies.push(node)
      }
    } else {
      roots.push(node)
    }
  })

  const annotate = (node: ChannelThreadMessage): { replyCount: number; unreadReplyCount: number } => {
    let replyCount = 0
    let unreadReplyCount = 0

    node.replies.forEach((reply) => {
      const nested = annotate(reply)
      replyCount += 1 + nested.replyCount
      unreadReplyCount += (reply.isUnread ? 1 : 0) + nested.unreadReplyCount
    })

    node.replyCount = replyCount
    node.unreadReplyCount = unreadReplyCount
    return { replyCount, unreadReplyCount }
  }

  roots.forEach(annotate)

  return roots
}

export async function createChannelMessage(options: {
  channelId: string
  parentMessageId?: string | null
  content: string
  actor: ActorIdentity
  channelType: string
  channelName: string
}) {
  if (options.parentMessageId) {
    const parentMessage = await prisma.message.findFirst({
      where: {
        id: options.parentMessageId,
        channelId: options.channelId,
      },
      select: {
        id: true,
      },
    })

    if (!parentMessage) {
      throw new Error('Parent message not found')
    }
  }

  const message = await prisma.message.create({
    data: {
      channelId: options.channelId,
      parentMessageId: options.parentMessageId || null,
      content: options.content,
      senderType: options.actor.type,
      senderId: options.actor.id,
      senderName: options.actor.name || null,
    },
  })

  await createMentionNotifications({
    content: options.content,
    href: `/channels/${options.channelType}/${options.channelId}`,
    sender: { id: options.actor.id, type: options.actor.type },
    title: `#${options.channelName}`,
    body: options.content.slice(0, 180),
  })

  return mapMessageNode({
    ...message,
    senderType: message.senderType,
  })
}

export async function deleteChannelMessage(
  channelId: string,
  messageId: string,
  actor: MessageActor
) {
  const [message, membership] = await Promise.all([
    prisma.message.findFirst({
      where: {
        id: messageId,
        channelId,
      },
      select: {
        id: true,
        senderId: true,
        senderType: true,
      },
    }),
    prisma.channelMember.findUnique({
      where: {
        channelId_actorId_actorType: {
          channelId,
          actorId: actor.id,
          actorType: actor.type,
        },
      },
      select: {
        role: true,
      },
    }),
  ])

  if (!message) {
    throw new Error('Message not found')
  }

  const isManager = membership?.role === 'owner' || membership?.role === 'moderator'
  const isSender = message.senderId === actor.id && message.senderType === actor.type

  if (!isManager && !isSender) {
    throw new Error('You do not have permission to delete this message')
  }

  return prisma.message.update({
    where: { id: messageId },
    data: {
      content: isManager ? '[removed by room moderation]' : '[removed by sender]',
      senderName: message.senderId === actor.id ? null : undefined,
    },
  })
}
