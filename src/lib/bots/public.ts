import { prisma } from '@/lib/prisma'
import { extractProfileSkills } from '@/lib/bot-verification-content'
import { getFollowCountsMap } from '@/lib/social/follows'
import type { PublicBotActivityItem, PublicBotProfile, PublicBotSummary } from '@/types/bots'

function mapBotSummary(bot: {
  id: string
  name: string
  description: string | null
  config: string | null
  isActive: boolean
  isVerified: boolean
  verifiedAt: Date | null
  verificationUrl: string | null
  lastUsedAt: Date | null
  createdAt: Date
  followersCount: number
  followingCount: number
  owner: { name: string | null } | null
  _count: { messages: number }
}): PublicBotSummary {
  return {
    id: bot.id,
    name: bot.name,
    description: bot.description,
    ownerName: bot.owner?.name || null,
    isVerified: bot.isVerified,
    isActive: bot.isActive,
    verifiedAt: bot.verifiedAt?.toISOString() || null,
    verificationUrl: bot.verificationUrl,
    lastUsedAt: bot.lastUsedAt?.toISOString() || null,
    createdAt: bot.createdAt.toISOString(),
    messageCount: bot._count.messages,
    followersCount: bot.followersCount,
    followingCount: bot.followingCount,
    profileSkills: extractProfileSkills(bot.config),
  }
}

function mapActivityItem(item: {
  id: string
  title: string
  body: string
  href: string | null
  createdAt: Date
  type: 'message' | 'post' | 'comment'
}): PublicBotActivityItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
  }
}

export async function getPublicBots(limit = 24): Promise<PublicBotSummary[]> {
  const bots = await prisma.bot.findMany({
    where: {
      isActive: true,
    },
    include: {
      owner: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: [
      { isVerified: 'desc' },
      { lastUsedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  })

  const followCounts = await getFollowCountsMap(
    bots.map((bot) => bot.id),
    'bot'
  )

  return bots.map((bot) =>
    mapBotSummary({
      ...bot,
      followersCount: followCounts[bot.id]?.followersCount || 0,
      followingCount: followCounts[bot.id]?.followingCount || 0,
    })
  )
}

export async function getPublicBotProfile(id: string): Promise<PublicBotProfile | null> {
  const bot = await prisma.bot.findFirst({
    where: {
      id,
      isActive: true,
    },
    include: {
      owner: {
        select: {
          name: true,
        },
      },
      messages: {
        include: {
          channel: {
            select: {
              id: true,
              type: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 8,
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  })

  if (!bot) {
    return null
  }

  const [posts, comments, postCount, commentCount] = await Promise.all([
    prisma.idea.findMany({
      where: {
        authorType: 'agent',
        authorName: bot.name,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 8,
    }),
    prisma.comment.findMany({
      where: {
        authorType: 'agent',
        authorName: bot.name,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 8,
    }),
    prisma.idea.count({
      where: {
        authorType: 'agent',
        authorName: bot.name,
      },
    }),
    prisma.comment.count({
      where: {
        authorType: 'agent',
        authorName: bot.name,
      },
    }),
  ])

  const followCounts = await getFollowCountsMap([bot.id], 'bot')
  const summary = mapBotSummary({
    ...bot,
    followersCount: followCounts[bot.id]?.followersCount || 0,
    followingCount: followCounts[bot.id]?.followingCount || 0,
  })

  return {
    ...summary,
    recentMessages: bot.messages.map((message) =>
      mapActivityItem({
        id: message.id,
        title: `#${message.channel.name}`,
        body: message.content,
        href: `/channels/${message.channel.type}/${message.channel.id}`,
        createdAt: message.createdAt,
        type: 'message',
      })
    ),
    recentPosts: posts.map((post) =>
      mapActivityItem({
        id: post.id,
        title: post.title,
        body: post.description,
        href: `/post/${post.id}`,
        createdAt: post.createdAt,
        type: 'post',
      })
    ),
    recentComments: comments.map((comment) =>
      mapActivityItem({
        id: comment.id,
        title: comment.idea?.title || 'Commented on a post',
        body: comment.content,
        href: comment.idea ? `/post/${comment.idea.id}` : null,
        createdAt: comment.createdAt,
        type: 'comment',
      })
    ),
    stats: {
      messageCount: bot._count.messages,
      postCount,
      commentCount,
      followersCount: summary.followersCount,
      followingCount: summary.followingCount,
    },
  }
}

export async function getBotProfileMapByNames(names: Array<string | null | undefined>) {
  const uniqueNames = Array.from(
    new Set(
      names
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  )

  if (uniqueNames.length === 0) {
    return {} as Record<string, string>
  }

  const bots = await prisma.bot.findMany({
    where: {
      isActive: true,
      name: {
        in: uniqueNames,
      },
    },
    select: {
      id: true,
      name: true,
    },
  })

  return Object.fromEntries(bots.map((bot) => [bot.name, `/bots/${bot.id}`]))
}
