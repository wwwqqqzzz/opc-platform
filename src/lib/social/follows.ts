import { prisma } from '@/lib/prisma'
import type {
  SocialActorPreview,
  SocialActorType,
  SocialFollowCounts,
  SocialFollowMode,
  SocialFollowPreview,
} from '@/types/social'

interface UserPreviewRecord {
  id: string
  name: string | null
}

interface BotPreviewRecord {
  id: string
  name: string
  isVerified: boolean
}

function mapUserPreview(user: UserPreviewRecord): SocialActorPreview {
  return {
    id: user.id,
    type: 'user',
    name: user.name || 'Human member',
    subtitle: 'Human member',
    href: null,
  }
}

function mapBotPreview(bot: BotPreviewRecord): SocialActorPreview {
  return {
    id: bot.id,
    type: 'bot',
    name: bot.name,
    subtitle: bot.isVerified ? 'Verified bot' : 'Bot account',
    href: `/bots/${bot.id}`,
  }
}

async function resolveActorPreviewMap(actorType: SocialActorType, actorIds: string[]) {
  const uniqueIds = Array.from(new Set(actorIds.filter(Boolean)))

  if (uniqueIds.length === 0) {
    return {} as Record<string, SocialActorPreview>
  }

  if (actorType === 'user') {
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    })

    return Object.fromEntries(users.map((user) => [user.id, mapUserPreview(user)]))
  }

  const bots = await prisma.bot.findMany({
    where: {
      id: {
        in: uniqueIds,
      },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      isVerified: true,
    },
  })

  return Object.fromEntries(bots.map((bot) => [bot.id, mapBotPreview(bot)]))
}

export async function getSocialActorPreview(
  actorId: string,
  actorType: SocialActorType
): Promise<SocialActorPreview | null> {
  const previewMap = await resolveActorPreviewMap(actorType, [actorId])
  return previewMap[actorId] || null
}

export async function ensureSocialActorExists(actorId: string, actorType: SocialActorType) {
  if (actorType === 'user') {
    const user = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true },
    })

    return Boolean(user)
  }

  const bot = await prisma.bot.findFirst({
    where: {
      id: actorId,
      isActive: true,
    },
    select: { id: true },
  })

  return Boolean(bot)
}

export async function getFollowCounts(
  actorId: string,
  actorType: SocialActorType
): Promise<SocialFollowCounts> {
  const [followersCount, followingCount] = await Promise.all([
    prisma.follow.count({
      where: {
        followingId: actorId,
        followingType: actorType,
      },
    }),
    prisma.follow.count({
      where: {
        followerId: actorId,
        followerType: actorType,
      },
    }),
  ])

  return {
    followersCount,
    followingCount,
  }
}

export async function getFollowCountsMap(
  actorIds: string[],
  actorType: SocialActorType
): Promise<Record<string, SocialFollowCounts>> {
  const uniqueIds = Array.from(new Set(actorIds.filter(Boolean)))

  if (uniqueIds.length === 0) {
    return {}
  }

  const [followers, following] = await Promise.all([
    prisma.follow.groupBy({
      by: ['followingId'],
      where: {
        followingType: actorType,
        followingId: {
          in: uniqueIds,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.follow.groupBy({
      by: ['followerId'],
      where: {
        followerType: actorType,
        followerId: {
          in: uniqueIds,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ])

  const baseMap = Object.fromEntries(
    uniqueIds.map((id) => [
      id,
      {
        followersCount: 0,
        followingCount: 0,
      },
    ])
  ) as Record<string, SocialFollowCounts>

  followers.forEach((entry) => {
    baseMap[entry.followingId].followersCount = entry._count._all
  })

  following.forEach((entry) => {
    baseMap[entry.followerId].followingCount = entry._count._all
  })

  return baseMap
}

export async function getSocialFollowList(
  actorId: string,
  actorType: SocialActorType,
  mode: SocialFollowMode,
  limit = 24
): Promise<SocialFollowPreview[]> {
  const where =
    mode === 'followers'
      ? {
          followingId: actorId,
          followingType: actorType,
        }
      : {
          followerId: actorId,
          followerType: actorType,
        }

  const rows = await prisma.follow.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  })

  const userIds: string[] = []
  const botIds: string[] = []

  rows.forEach((row) => {
    const targetId = mode === 'followers' ? row.followerId : row.followingId
    const targetType = (mode === 'followers' ? row.followerType : row.followingType) as SocialActorType

    if (targetType === 'user') {
      userIds.push(targetId)
    } else {
      botIds.push(targetId)
    }
  })

  const [userMap, botMap] = await Promise.all([
    resolveActorPreviewMap('user', userIds),
    resolveActorPreviewMap('bot', botIds),
  ])

  return rows
    .map((row) => {
      const targetId = mode === 'followers' ? row.followerId : row.followingId
      const targetType = (mode === 'followers' ? row.followerType : row.followingType) as SocialActorType
      const preview = targetType === 'user' ? userMap[targetId] : botMap[targetId]

      if (!preview) {
        return null
      }

      return {
        ...preview,
        followedAt: row.createdAt.toISOString(),
      } satisfies SocialFollowPreview
    })
    .filter((item): item is SocialFollowPreview => Boolean(item))
}

export async function getSocialFollowOverview(actorId: string, actorType: SocialActorType, limit = 12) {
  const [counts, followers, following] = await Promise.all([
    getFollowCounts(actorId, actorType),
    getSocialFollowList(actorId, actorType, 'followers', limit),
    getSocialFollowList(actorId, actorType, 'following', limit),
  ])

  return {
    counts,
    followers,
    following,
  }
}

export async function isFollowingActor(
  followerId: string,
  followerType: SocialActorType,
  followingId: string,
  followingType: SocialActorType
) {
  const relation = await prisma.follow.findFirst({
    where: {
      followerId,
      followerType,
      followingId,
      followingType,
    },
    select: {
      id: true,
    },
  })

  return Boolean(relation)
}
