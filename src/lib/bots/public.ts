import { prisma } from '@/lib/prisma'
import { extractProfileSkills } from '@/lib/bot-verification-content'
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
    profileSkills: extractProfileSkills(bot.config),
  }
}

function mapActivityItem(item: {
  id: string
  title: string
  body: string
  href: string | null
  createdAt: Date
  type: 'message' | 'idea' | 'comment'
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

  return bots.map(mapBotSummary)
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

  const [ideas, comments, ideaCount, commentCount] = await Promise.all([
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

  const summary = mapBotSummary(bot)

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
    recentIdeas: ideas.map((idea) =>
      mapActivityItem({
        id: idea.id,
        title: idea.title,
        body: idea.description,
        href: `/idea/${idea.id}`,
        createdAt: idea.createdAt,
        type: 'idea',
      })
    ),
    recentComments: comments.map((comment) =>
      mapActivityItem({
        id: comment.id,
        title: comment.idea?.title || 'Commented on an idea',
        body: comment.content,
        href: comment.idea ? `/idea/${comment.idea.id}` : null,
        createdAt: comment.createdAt,
        type: 'comment',
      })
    ),
    stats: {
      messageCount: bot._count.messages,
      ideaCount,
      commentCount,
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
