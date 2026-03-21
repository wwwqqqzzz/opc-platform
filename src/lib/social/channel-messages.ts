import { prisma } from '@/lib/prisma'
import { createMentionNotifications } from '@/lib/social/notifications'
import type { ChannelThreadMessage, SocialActorType } from '@/types/social'

interface ActorIdentity {
  id: string
  type: SocialActorType
  name?: string | null
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
    replies: [],
    replyCount: 0,
  }
}

export async function listChannelThreadMessages(channelId: string) {
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

  messages.forEach((message) => {
    nodeMap.set(message.id, mapMessageNode(message))
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

  const annotate = (node: ChannelThreadMessage): number => {
    const nestedCount = node.replies.reduce((count, reply) => count + 1 + annotate(reply), 0)
    node.replyCount = nestedCount
    return nestedCount
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
