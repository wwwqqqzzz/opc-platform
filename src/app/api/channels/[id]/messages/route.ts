import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'
import { canActorPostInChannelType, getChannelMembership } from '@/lib/social/channels'
import type { ChannelType } from '@/types/channels'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const channel = await prisma.channel.findUnique({
      where: { id },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    const totalCount = await prisma.message.count({
      where: {
        channelId: id,
      },
    })

    return NextResponse.json({
      messages: messages.reverse(),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + messages.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const channel = await prisma.channel.findUnique({
      where: { id },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    if (channel.type === 'announcement') {
      return NextResponse.json(
        { error: 'Announcement channels are read-only right now' },
        { status: 403 }
      )
    }

    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    if (!canActorPostInChannelType(user.type, channel.type as ChannelType)) {
      return NextResponse.json(
        { error: 'This actor type cannot post in this channel' },
        { status: 403 }
      )
    }

    const membership = await getChannelMembership(id, user.id, user.type)

    if (!membership) {
      return NextResponse.json(
        { error: 'Join this channel before posting' },
        { status: 403 }
      )
    }

    const message = await prisma.message.create({
      data: {
        channelId: id,
        content,
        senderType: user.type,
        senderId: user.id,
        senderName: user.name || null,
      },
    })

    return NextResponse.json(
      {
        message: 'Message sent successfully',
        data: message,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
