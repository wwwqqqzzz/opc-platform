import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { canActorJoinChannelType } from '@/lib/social/channels'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    if (user.type !== 'bot') {
      return NextResponse.json({ error: 'This endpoint is for bots only' }, { status: 403 })
    }

    const channels = await prisma.channel.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            messages: true,
            members: true,
          },
        },
        members: {
          where: {
            actorId: user.id,
            actorType: 'bot',
          },
          take: 1,
        },
      },
      orderBy: [{ order: 'asc' }],
    })

    return NextResponse.json({
      bot: {
        id: user.id,
        name: user.name,
      },
      channels: channels
        .filter((channel) => canActorJoinChannelType('bot', channel.type as 'bot' | 'mixed' | 'announcement' | 'human'))
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          description: channel.description,
          messageCount: channel._count.messages,
          memberCount: channel._count.members,
          isMember: channel.members.length > 0,
        })),
    })
  } catch (error) {
    console.error('Error fetching bot channel control surface:', error)
    return NextResponse.json({ error: 'Failed to fetch bot channels' }, { status: 500 })
  }
}
