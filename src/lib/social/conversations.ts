import { prisma } from '@/lib/prisma'
import type {
  SocialActorPreview,
  SocialActorType,
  SocialConversationSummary,
  SocialMessage,
} from '@/types/social'
import { ensureSocialActorExists, getSocialActorPreview } from './follows'
import { createDmNotification } from './notifications'

interface ActorIdentity {
  id: string
  type: SocialActorType
}

function actorKey(actor: ActorIdentity) {
  return `${actor.type}:${actor.id}`
}

function canonicalizeConversationActors(actorA: ActorIdentity, actorB: ActorIdentity) {
  const [first, second] = [actorA, actorB].sort((left, right) =>
    actorKey(left).localeCompare(actorKey(right))
  )

  return {
    user1Id: first.id,
    user1Type: first.type,
    user2Id: second.id,
    user2Type: second.type,
  }
}

async function mapConversationSummary(
  conversation: {
    id: string
    user1Id: string
    user1Type: string
    user2Id: string
    user2Type: string
    lastMessageAt: Date
  },
  actor: ActorIdentity
): Promise<SocialConversationSummary | null> {
  const counterpartId = conversation.user1Id === actor.id && conversation.user1Type === actor.type
    ? conversation.user2Id
    : conversation.user1Id
  const counterpartType = (
    conversation.user1Id === actor.id && conversation.user1Type === actor.type
      ? conversation.user2Type
      : conversation.user1Type
  ) as SocialActorType

  const [counterpart, lastMessage, unreadCount] = await Promise.all([
    getSocialActorPreview(counterpartId, counterpartType),
    prisma.privateMessage.findFirst({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        content: true,
      },
    }),
    prisma.privateMessage.count({
      where: {
        conversationId: conversation.id,
        isRead: false,
        senderId: {
          not: actor.id,
        },
      },
    }),
  ])

  if (!counterpart) {
    return null
  }

  return {
    id: conversation.id,
    counterpart,
    lastMessagePreview: lastMessage?.content || null,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    unreadCount,
  }
}

export async function listConversationsForActor(
  actorId: string,
  actorType: SocialActorType
): Promise<SocialConversationSummary[]> {
  const conversations = await prisma.privateConversation.findMany({
    where: {
      OR: [
        {
          user1Id: actorId,
          user1Type: actorType,
        },
        {
          user2Id: actorId,
          user2Type: actorType,
        },
      ],
    },
    orderBy: {
      lastMessageAt: 'desc',
    },
  })

  const summaries = await Promise.all(
    conversations.map((conversation) => mapConversationSummary(conversation, { id: actorId, type: actorType }))
  )

  return summaries.filter((item): item is SocialConversationSummary => Boolean(item))
}

export async function getConversationForActor(conversationId: string, actor: ActorIdentity) {
  const conversation = await prisma.privateConversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        {
          user1Id: actor.id,
          user1Type: actor.type,
        },
        {
          user2Id: actor.id,
          user2Type: actor.type,
        },
      ],
    },
  })

  if (!conversation) {
    return null
  }

  const summary = await mapConversationSummary(conversation, actor)

  if (!summary) {
    return null
  }

  return {
    conversation,
    summary,
  }
}

export async function getOrCreateConversation(
  actor: ActorIdentity,
  counterpart: ActorIdentity
) {
  if (actor.id === counterpart.id && actor.type === counterpart.type) {
    throw new Error('You cannot create a conversation with yourself')
  }

  const counterpartExists = await ensureSocialActorExists(counterpart.id, counterpart.type)

  if (!counterpartExists) {
    throw new Error('Counterpart actor not found')
  }

  const canonical = canonicalizeConversationActors(actor, counterpart)

  const existing = await prisma.privateConversation.findFirst({
    where: {
      user1Id: canonical.user1Id,
      user1Type: canonical.user1Type,
      user2Id: canonical.user2Id,
      user2Type: canonical.user2Type,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.privateConversation.create({
    data: {
      ...canonical,
      lastMessageAt: new Date(),
    },
  })
}

export async function listConversationMessages(
  conversationId: string,
  actor: ActorIdentity
): Promise<SocialMessage[]> {
  const conversation = await getConversationForActor(conversationId, actor)

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  const messages = await prisma.privateMessage.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  await prisma.privateMessage.updateMany({
    where: {
      conversationId,
      senderId: {
        not: actor.id,
      },
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  return messages.map((message) => ({
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderType: message.senderType as SocialActorType,
    content: message.content,
    isRead: message.isRead,
    createdAt: message.createdAt.toISOString(),
  }))
}

export async function sendConversationMessage(
  conversationId: string,
  actor: ActorIdentity,
  content: string
) {
  const conversation = await getConversationForActor(conversationId, actor)

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  const nextMessage = await prisma.privateMessage.create({
    data: {
      conversationId,
      senderId: actor.id,
      senderType: actor.type,
      content,
      isRead: false,
    },
  })

  await prisma.privateConversation.update({
    where: {
      id: conversationId,
    },
    data: {
      lastMessageAt: nextMessage.createdAt,
    },
  })

  const recipient =
    conversation.conversation.user1Id === actor.id && conversation.conversation.user1Type === actor.type
      ? {
          id: conversation.conversation.user2Id,
          type: conversation.conversation.user2Type as SocialActorType,
        }
      : {
          id: conversation.conversation.user1Id,
          type: conversation.conversation.user1Type as SocialActorType,
        }

  await createDmNotification({
    recipient,
    sender: actor,
    conversationId,
    content,
  })

  return {
    id: nextMessage.id,
    conversationId: nextMessage.conversationId,
    senderId: nextMessage.senderId,
    senderType: nextMessage.senderType as SocialActorType,
    content: nextMessage.content,
    isRead: nextMessage.isRead,
    createdAt: nextMessage.createdAt.toISOString(),
  } satisfies SocialMessage
}

export async function getCounterpartForConversation(
  conversation: {
    user1Id: string
    user1Type: string
    user2Id: string
    user2Type: string
  },
  actor: ActorIdentity
): Promise<SocialActorPreview | null> {
  const counterpartId =
    conversation.user1Id === actor.id && conversation.user1Type === actor.type
      ? conversation.user2Id
      : conversation.user1Id
  const counterpartType = (
    conversation.user1Id === actor.id && conversation.user1Type === actor.type
      ? conversation.user2Type
      : conversation.user1Type
  ) as SocialActorType

  return getSocialActorPreview(counterpartId, counterpartType)
}
