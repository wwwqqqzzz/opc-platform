import { prisma } from '@/lib/prisma'
import { getSocialActorPreview } from '@/lib/social/follows'
import type {
  SocialActorType,
  SocialRelationPreview,
  SocialRelationStatus,
  SocialRelationType,
} from '@/types/social'

interface ActorIdentity {
  id: string
  type: SocialActorType
}

function isRelationType(value: string): value is SocialRelationType {
  return value === 'block' || value === 'mute'
}

export async function createActorRelation(
  actor: ActorIdentity,
  target: ActorIdentity,
  relationType: SocialRelationType
) {
  if (actor.id === target.id && actor.type === target.type) {
    throw new Error(`You cannot ${relationType} yourself`)
  }

  return prisma.actorRelation.upsert({
    where: {
      actorId_actorType_targetId_targetType_relationType: {
        actorId: actor.id,
        actorType: actor.type,
        targetId: target.id,
        targetType: target.type,
        relationType,
      },
    },
    update: {},
    create: {
      actorId: actor.id,
      actorType: actor.type,
      targetId: target.id,
      targetType: target.type,
      relationType,
    },
  })
}

export async function removeActorRelation(
  actor: ActorIdentity,
  target: ActorIdentity,
  relationType: SocialRelationType
) {
  await prisma.actorRelation.deleteMany({
    where: {
      actorId: actor.id,
      actorType: actor.type,
      targetId: target.id,
      targetType: target.type,
      relationType,
    },
  })
}

export async function getRelationStatus(
  actor: ActorIdentity,
  target: ActorIdentity
): Promise<SocialRelationStatus> {
  const relations = await prisma.actorRelation.findMany({
    where: {
      OR: [
        {
          actorId: actor.id,
          actorType: actor.type,
          targetId: target.id,
          targetType: target.type,
        },
        {
          actorId: target.id,
          actorType: target.type,
          targetId: actor.id,
          targetType: actor.type,
        },
      ],
    },
  })

  return {
    blocked: relations.some(
      (relation) =>
        relation.actorId === actor.id &&
        relation.actorType === actor.type &&
        relation.relationType === 'block'
    ),
    muted: relations.some(
      (relation) =>
        relation.actorId === actor.id &&
        relation.actorType === actor.type &&
        relation.relationType === 'mute'
    ),
    blockedByTarget: relations.some(
      (relation) =>
        relation.actorId === target.id &&
        relation.actorType === target.type &&
        relation.relationType === 'block'
    ),
    mutedByTarget: relations.some(
      (relation) =>
        relation.actorId === target.id &&
        relation.actorType === target.type &&
        relation.relationType === 'mute'
    ),
  }
}

export async function areActorsBlocked(actor: ActorIdentity, target: ActorIdentity) {
  const status = await getRelationStatus(actor, target)
  return status.blocked || status.blockedByTarget
}

export async function shouldSuppressNotifications(recipient: ActorIdentity, sender: ActorIdentity) {
  const status = await getRelationStatus(recipient, sender)
  return status.blocked || status.blockedByTarget || status.muted
}

export async function listActorRelations(
  actor: ActorIdentity,
  relationType: SocialRelationType
): Promise<SocialRelationPreview[]> {
  const rows = await prisma.actorRelation.findMany({
    where: {
      actorId: actor.id,
      actorType: actor.type,
      relationType,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const previews = await Promise.all(
    rows.map(async (row) => {
      if (!isRelationType(row.relationType)) {
        return null
      }

      const preview = await getSocialActorPreview(row.targetId, row.targetType as SocialActorType)
      if (!preview) {
        return null
      }

      return {
        ...preview,
        relationType: row.relationType,
        createdAt: row.createdAt.toISOString(),
      } satisfies SocialRelationPreview
    })
  )

  return previews.filter((item): item is SocialRelationPreview => Boolean(item))
}
