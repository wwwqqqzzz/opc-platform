import { prisma } from '@/lib/prisma'
import { getSocialActorPreview } from '@/lib/social/follows'
import { areActorsBlocked } from '@/lib/social/relations'
import type {
  SocialActorType,
  SocialConnectionPreview,
  SocialConnectionStatus,
  SocialConnectionType,
} from '@/types/social'

interface ActorIdentity {
  id: string
  type: SocialActorType
}

function isConnectionType(value: string): value is SocialConnectionType {
  return value === 'friend' || value === 'contact'
}

function isConnectionStatus(value: string): value is SocialConnectionStatus {
  return value === 'pending' || value === 'accepted' || value === 'declined'
}

export async function requestConnection(
  actor: ActorIdentity,
  target: ActorIdentity,
  connectionType: SocialConnectionType
) {
  if (actor.id === target.id && actor.type === target.type) {
    throw new Error(`You cannot create a ${connectionType} request with yourself`)
  }

  if (await areActorsBlocked(actor, target)) {
    throw new Error('Connection requests are blocked between these actors')
  }

  return prisma.actorConnection.upsert({
    where: {
      initiatorActorId_initiatorActorType_recipientActorId_recipientActorType_connectionType: {
        initiatorActorId: actor.id,
        initiatorActorType: actor.type,
        recipientActorId: target.id,
        recipientActorType: target.type,
        connectionType,
      },
    },
    update: {
      status: 'pending',
      respondedAt: null,
    },
    create: {
      initiatorActorId: actor.id,
      initiatorActorType: actor.type,
      recipientActorId: target.id,
      recipientActorType: target.type,
      connectionType,
    },
  })
}

export async function respondToConnection(
  actor: ActorIdentity,
  connectionId: string,
  action: 'accept' | 'decline'
) {
  const connection = await prisma.actorConnection.findFirst({
    where: {
      id: connectionId,
      recipientActorId: actor.id,
      recipientActorType: actor.type,
      status: 'pending',
    },
  })

  if (!connection) {
    throw new Error('Connection request not found')
  }

  return prisma.actorConnection.update({
    where: { id: connectionId },
    data: {
      status: action === 'accept' ? 'accepted' : 'declined',
      respondedAt: new Date(),
    },
  })
}

export async function removeConnection(
  actor: ActorIdentity,
  target: ActorIdentity,
  connectionType: SocialConnectionType
) {
  await prisma.actorConnection.deleteMany({
    where: {
      connectionType,
      status: {
        in: ['pending', 'accepted'],
      },
      OR: [
        {
          initiatorActorId: actor.id,
          initiatorActorType: actor.type,
          recipientActorId: target.id,
          recipientActorType: target.type,
        },
        {
          initiatorActorId: target.id,
          initiatorActorType: target.type,
          recipientActorId: actor.id,
          recipientActorType: actor.type,
        },
      ],
    },
  })
}

export async function listConnectionsForActor(
  actor: ActorIdentity,
  options: {
    connectionType?: SocialConnectionType
    status?: SocialConnectionStatus
    direction?: 'incoming' | 'outgoing' | 'all'
  } = {}
): Promise<SocialConnectionPreview[]> {
  const rows = await prisma.actorConnection.findMany({
    where: {
      ...(options.connectionType ? { connectionType: options.connectionType } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.direction === 'incoming'
        ? {
            recipientActorId: actor.id,
            recipientActorType: actor.type,
          }
        : options.direction === 'outgoing'
        ? {
            initiatorActorId: actor.id,
            initiatorActorType: actor.type,
          }
        : {
            OR: [
              {
                initiatorActorId: actor.id,
                initiatorActorType: actor.type,
              },
              {
                recipientActorId: actor.id,
                recipientActorType: actor.type,
              },
            ],
          }),
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const previews = await Promise.all(
    rows.map(async (row) => {
      if (!isConnectionType(row.connectionType) || !isConnectionStatus(row.status)) {
        return null
      }

      const isIncoming = row.recipientActorId === actor.id && row.recipientActorType === actor.type
      const counterpart = await getSocialActorPreview(
        isIncoming ? row.initiatorActorId : row.recipientActorId,
        (isIncoming ? row.initiatorActorType : row.recipientActorType) as SocialActorType
      )

      if (!counterpart) {
        return null
      }

      return {
        ...counterpart,
        connectionType: row.connectionType,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        respondedAt: row.respondedAt?.toISOString() || null,
        direction: isIncoming ? 'incoming' : 'outgoing',
      } satisfies SocialConnectionPreview
    })
  )

  return previews.filter((item): item is SocialConnectionPreview => Boolean(item))
}
