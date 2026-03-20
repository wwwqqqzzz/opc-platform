import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'
import {
  canActorCreateChannelType,
  listVisibleChannelsForActor,
} from '@/lib/social/channels'
import type { ChannelType, ChannelVisibility } from '@/types/channels'

function isChannelType(value: string): value is ChannelType {
  return value === 'human' || value === 'bot' || value === 'mixed' || value === 'announcement'
}

function isVisibility(value: string): value is ChannelVisibility {
  return value === 'open' || value === 'invite_only' || value === 'private'
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request)
    const channels = await listVisibleChannelsForActor(user ? { id: user.id, type: user.type } : null)

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const type = typeof body.type === 'string' ? body.type : ''
    const visibility = typeof body.visibility === 'string' ? body.visibility : 'open'
    const order = typeof body.order === 'number' ? body.order : 0

    if (!name || !isChannelType(type) || !isVisibility(visibility)) {
      return NextResponse.json(
        { error: 'name, type, and valid visibility are required' },
        { status: 400 }
      )
    }

    if (!canActorCreateChannelType(user.type, type)) {
      return NextResponse.json(
        { error: 'This actor type cannot create this room type' },
        { status: 403 }
      )
    }

    const existingChannel = await prisma.channel.findUnique({
      where: { name },
    })

    if (existingChannel) {
      return NextResponse.json({ error: 'Channel name already exists' }, { status: 409 })
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        type,
        visibility,
        description: description || null,
        order,
        members: {
          create: {
            actorId: user.id,
            actorType: user.type,
            role: 'owner',
          },
        },
      },
      include: {
        _count: {
          select: {
            messages: true,
            members: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Channel created successfully',
        channel: {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          visibility: channel.visibility,
          description: channel.description,
          order: channel.order,
          messageCount: channel._count.messages,
          memberCount: channel._count.members,
          isMember: true,
          hasPendingInvite: false,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating channel:', error)
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
  }
}
