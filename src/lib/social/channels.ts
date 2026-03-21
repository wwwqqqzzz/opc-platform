import { prisma } from '@/lib/prisma'
import { getSocialActorPreview } from '@/lib/social/follows'
import { areActorsBlocked } from '@/lib/social/relations'
import type {
  ChannelActorType,
  ChannelInvitePreview,
  ChannelMemberPreview,
  ChannelMemberRole,
  ChannelSummary,
  ChannelType,
  ChannelVisibility,
} from '@/types/channels'

interface ActorIdentity {
  id: string
  type: ChannelActorType
}

interface ChannelAccessSnapshot {
  id: string
  name: string
  type: ChannelType
  visibility: ChannelVisibility
  isActive: boolean
  membership: {
    id: string
    role: ChannelMemberRole
    joinedAt: Date
    lastReadAt: Date | null
  } | null
  pendingInvite: {
    id: string
  } | null
}

function isChannelType(value: string): value is ChannelType {
  return value === 'human' || value === 'bot' || value === 'mixed' || value === 'announcement'
}

function isVisibility(value: string): value is ChannelVisibility {
  return value === 'open' || value === 'invite_only' || value === 'private'
}

export function canActorJoinChannelType(actorType: ChannelActorType, channelType: ChannelType) {
  if (channelType === 'announcement' || channelType === 'mixed') {
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

export function canActorCreateChannelType(actorType: ChannelActorType, channelType: ChannelType) {
  if (channelType === 'announcement') {
    return false
  }

  if (channelType === 'mixed') {
    return true
  }

  return actorType === 'user' ? channelType === 'human' : channelType === 'bot'
}

async function getChannelAccessSnapshot(
  channelId: string,
  actor?: ActorIdentity | null
): Promise<ChannelAccessSnapshot | null> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      name: true,
      type: true,
      visibility: true,
      isActive: true,
      members: actor
        ? {
            where: {
              actorId: actor.id,
              actorType: actor.type,
            },
            take: 1,
            select: {
              id: true,
              role: true,
              joinedAt: true,
              lastReadAt: true,
            },
          }
        : false,
      invites: actor
        ? {
            where: {
              invitedActorId: actor.id,
              invitedActorType: actor.type,
              status: 'pending',
            },
            take: 1,
            select: {
              id: true,
            },
          }
        : false,
    },
  })

  if (!channel || !isChannelType(channel.type) || !isVisibility(channel.visibility)) {
    return null
  }

  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    visibility: channel.visibility,
    isActive: channel.isActive,
    membership: actor && Array.isArray(channel.members) && channel.members[0]
      ? {
          id: channel.members[0].id,
          role: channel.members[0].role as ChannelMemberRole,
          joinedAt: channel.members[0].joinedAt,
          lastReadAt: channel.members[0].lastReadAt,
        }
      : null,
    pendingInvite: actor && Array.isArray(channel.invites) && channel.invites[0]
      ? {
          id: channel.invites[0].id,
        }
      : null,
  }
}

export function canActorViewChannel(snapshot: ChannelAccessSnapshot, actor?: ActorIdentity | null) {
  if (!snapshot.isActive) {
    return false
  }

  if (snapshot.visibility === 'open' || snapshot.visibility === 'invite_only') {
    return true
  }

  if (!actor) {
    return false
  }

  return Boolean(snapshot.membership || snapshot.pendingInvite)
}

export function canActorManageChannel(snapshot: ChannelAccessSnapshot, actor?: ActorIdentity | null) {
  if (!actor || !snapshot.membership) {
    return false
  }

  return snapshot.membership.role === 'owner' || snapshot.membership.role === 'moderator'
}

export function canActorManageModerators(snapshot: ChannelAccessSnapshot, actor?: ActorIdentity | null) {
  if (!actor || !snapshot.membership) {
    return false
  }

  return snapshot.membership.role === 'owner'
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

export async function getChannelAccessForActor(channelId: string, actor?: ActorIdentity | null) {
  const snapshot = await getChannelAccessSnapshot(channelId, actor)

  if (!snapshot) {
    throw new Error('Channel not found')
  }

  return {
    channelId: snapshot.id,
    name: snapshot.name,
    type: snapshot.type,
    visibility: snapshot.visibility,
    isMember: Boolean(snapshot.membership),
    membershipRole: snapshot.membership?.role || null,
    hasPendingInvite: Boolean(snapshot.pendingInvite),
    canView: canActorViewChannel(snapshot, actor),
    canPost:
      Boolean(snapshot.membership) &&
      actor != null &&
      canActorPostInChannelType(actor.type, snapshot.type),
    canManage: canActorManageChannel(snapshot, actor),
  }
}

export async function joinChannel(channelId: string, actorId: string, actorType: ChannelActorType) {
  const snapshot = await getChannelAccessSnapshot(channelId, { id: actorId, type: actorType })

  if (!snapshot) {
    throw new Error('Channel not found')
  }

  if (!snapshot.isActive) {
    throw new Error('Channel not found')
  }

  if (!canActorJoinChannelType(actorType, snapshot.type)) {
    throw new Error('This actor type cannot join this channel')
  }

  if (!snapshot.membership && snapshot.visibility !== 'open' && !snapshot.pendingInvite) {
    throw new Error('This room requires an invite')
  }

  const membership = await prisma.channelMember.upsert({
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
      role: 'member',
    },
  })

  if (snapshot.pendingInvite) {
    await prisma.channelInvite.update({
      where: {
        id: snapshot.pendingInvite.id,
      },
      data: {
        status: 'accepted',
        respondedAt: new Date(),
      },
    })
  }

  return membership
}

export async function leaveChannel(channelId: string, actorId: string, actorType: ChannelActorType) {
  const membership = await getChannelMembership(channelId, actorId, actorType)

  if (membership?.role === 'owner') {
    throw new Error('Channel owners cannot leave their own room')
  }

  await prisma.channelMember.deleteMany({
    where: {
      channelId,
      actorId,
      actorType,
    },
  })
}

export async function touchChannelReadState(channelId: string, actorId: string, actorType: ChannelActorType) {
  await prisma.channelMember.updateMany({
    where: {
      channelId,
      actorId,
      actorType,
    },
    data: {
      lastReadAt: new Date(),
    },
  })
}

export async function listChannelMembers(channelId: string, limit = 24): Promise<ChannelMemberPreview[]> {
  const members = await prisma.channelMember.findMany({
    where: {
      channelId,
    },
    orderBy: [{ role: 'asc' }, { joinedAt: 'desc' }],
    take: limit,
  })

  const actorPreviews = await Promise.all(
    members.map(async (member) => {
      const preview = await getSocialActorPreview(member.actorId, member.actorType as ChannelActorType)

      if (!preview) {
        return null
      }

      return {
        id: member.id,
        actorId: member.actorId,
        actorType: member.actorType as ChannelActorType,
        role: member.role as ChannelMemberRole,
        name: preview.name,
        subtitle: `${preview.subtitle} · ${member.role}`,
        href: preview.href,
        joinedAt: member.joinedAt.toISOString(),
      } satisfies ChannelMemberPreview
    })
  )

  return actorPreviews.filter((item): item is ChannelMemberPreview => Boolean(item))
}

export async function inviteActorToChannel(
  channelId: string,
  invitedActorId: string,
  invitedActorType: ChannelActorType,
  invitedBy: ActorIdentity
) {
  const snapshot = await getChannelAccessSnapshot(channelId, invitedBy)

  if (!snapshot) {
    throw new Error('Channel not found')
  }

  if (!canActorManageChannel(snapshot, invitedBy)) {
    throw new Error('Only room owners and moderators can invite members')
  }

  if (!canActorJoinChannelType(invitedActorType, snapshot.type)) {
    throw new Error('This actor type cannot join this room')
  }

  const actorExists = await getSocialActorPreview(invitedActorId, invitedActorType)
  if (!actorExists) {
    throw new Error('Invited actor not found')
  }

  if (await areActorsBlocked(invitedBy, { id: invitedActorId, type: invitedActorType })) {
    throw new Error('Room invites are blocked between these actors')
  }

  if (await getChannelMembership(channelId, invitedActorId, invitedActorType)) {
    throw new Error('Actor is already a member')
  }

  return prisma.channelInvite.upsert({
    where: {
      channelId_invitedActorId_invitedActorType: {
        channelId,
        invitedActorId,
        invitedActorType,
      },
    },
    update: {
      status: 'pending',
      respondedAt: null,
      invitedByActorId: invitedBy.id,
      invitedByActorType: invitedBy.type,
    },
    create: {
      channelId,
      invitedActorId,
      invitedActorType,
      invitedByActorId: invitedBy.id,
      invitedByActorType: invitedBy.type,
      status: 'pending',
    },
  })
}

export async function listPendingInvitesForActor(
  actorId: string,
  actorType: ChannelActorType
): Promise<ChannelInvitePreview[]> {
  const invites = await prisma.channelInvite.findMany({
    where: {
      invitedActorId: actorId,
      invitedActorType: actorType,
      status: 'pending',
      channel: {
        isActive: true,
      },
    },
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          type: true,
          visibility: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const inviterPreviews = await Promise.all(
    invites.map((invite) =>
      getSocialActorPreview(invite.invitedByActorId, invite.invitedByActorType as ChannelActorType)
    )
  )

  return invites.map((invite, index) => ({
    id: invite.id,
    channelId: invite.channel.id,
    channelName: invite.channel.name,
    channelType: invite.channel.type as ChannelType,
    channelVisibility: invite.channel.visibility as ChannelVisibility,
    invitedActorId: invite.invitedActorId,
    invitedActorType: invite.invitedActorType as ChannelActorType,
    invitedByActorId: invite.invitedByActorId,
    invitedByActorType: invite.invitedByActorType as ChannelActorType,
    invitedByName: inviterPreviews[index]?.name || 'Unknown actor',
    status: invite.status as 'pending' | 'accepted' | 'declined',
    createdAt: invite.createdAt.toISOString(),
    respondedAt: invite.respondedAt?.toISOString() || null,
  }))
}

export async function respondToChannelInvite(
  inviteId: string,
  actor: ActorIdentity,
  action: 'accept' | 'decline'
) {
  const invite = await prisma.channelInvite.findFirst({
    where: {
      id: inviteId,
      invitedActorId: actor.id,
      invitedActorType: actor.type,
      status: 'pending',
    },
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          type: true,
          visibility: true,
          isActive: true,
        },
      },
    },
  })

  if (!invite || !isChannelType(invite.channel.type) || !isVisibility(invite.channel.visibility)) {
    throw new Error('Invite not found')
  }

  if (action === 'decline') {
    return prisma.channelInvite.update({
      where: { id: inviteId },
      data: {
        status: 'declined',
        respondedAt: new Date(),
      },
    })
  }

  await joinChannel(invite.channelId, actor.id, actor.type)

  return prisma.channelInvite.update({
    where: { id: inviteId },
    data: {
      status: 'accepted',
      respondedAt: new Date(),
    },
  })
}

export async function setChannelModerator(
  channelId: string,
  targetActorId: string,
  targetActorType: ChannelActorType,
  actor: ActorIdentity,
  makeModerator: boolean
) {
  const snapshot = await getChannelAccessSnapshot(channelId, actor)

  if (!snapshot) {
    throw new Error('Channel not found')
  }

  if (!canActorManageModerators(snapshot, actor)) {
    throw new Error('Only room owners can manage moderators')
  }

  const targetMembership = await getChannelMembership(channelId, targetActorId, targetActorType)

  if (!targetMembership) {
    throw new Error('Target member not found')
  }

  if (targetMembership.role === 'owner') {
    throw new Error('Room ownership cannot be changed here')
  }

  return prisma.channelMember.update({
    where: {
      channelId_actorId_actorType: {
        channelId,
        actorId: targetActorId,
        actorType: targetActorType,
      },
    },
    data: {
      role: makeModerator ? 'moderator' : 'member',
    },
  })
}

export async function listVisibleChannelsForActor(actor?: ActorIdentity | null): Promise<ChannelSummary[]> {
  const channels = await prisma.channel.findMany({
    where: {
      isActive: true,
      ...(actor
        ? {
            OR: [
              { visibility: 'open' },
              { visibility: 'invite_only' },
              {
                visibility: 'private',
                members: {
                  some: {
                    actorId: actor.id,
                    actorType: actor.type,
                  },
                },
              },
              {
                visibility: 'private',
                invites: {
                  some: {
                    invitedActorId: actor.id,
                    invitedActorType: actor.type,
                    status: 'pending',
                  },
                },
              },
            ],
          }
        : {
            visibility: 'open',
          }),
    },
    include: {
      _count: {
        select: {
          messages: true,
          members: true,
        },
      },
      members: actor
        ? {
            where: {
              actorId: actor.id,
              actorType: actor.type,
            },
            take: 1,
            select: {
              joinedAt: true,
              role: true,
              lastReadAt: true,
            },
          }
        : false,
      invites: actor
        ? {
            where: {
              invitedActorId: actor.id,
              invitedActorType: actor.type,
              status: 'pending',
            },
            take: 1,
          }
        : false,
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  })

  return Promise.all(
    channels
      .filter((channel) => isChannelType(channel.type) && isVisibility(channel.visibility))
      .filter((channel) => !actor || canActorJoinChannelType(actor.type, channel.type as ChannelType))
      .map(async (channel) => {
        const membership = actor && Array.isArray(channel.members) ? channel.members[0] : null
        const unreadCount =
          actor && membership
            ? await prisma.message.count({
                where: {
                  channelId: channel.id,
                  createdAt: membership.lastReadAt ? { gt: membership.lastReadAt } : undefined,
                  senderId: {
                    not: actor.id,
                  },
                },
              })
            : 0

        return {
          id: channel.id,
          name: channel.name,
          description: channel.description,
          type: channel.type as ChannelType,
          visibility: channel.visibility as ChannelVisibility,
          messageCount: channel._count.messages,
          memberCount: channel._count.members,
          unreadCount,
          isMember: Boolean(membership),
          hasPendingInvite: actor && Array.isArray(channel.invites) ? channel.invites.length > 0 : false,
        } satisfies ChannelSummary
      })
  )
}
