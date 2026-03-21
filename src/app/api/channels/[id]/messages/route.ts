import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'
import { createChannelMessage, listChannelThreadMessages } from '@/lib/social/channel-messages'
import {
  canActorPostInChannelType,
  getChannelAccessForActor,
  touchChannelReadState,
} from '@/lib/social/channels'
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
    const { user } = await authenticateRequest(request)

    const access = await getChannelAccessForActor(id, user ? { id: user.id, type: user.type } : null)

    if (!access.canView) {
      return NextResponse.json({ error: 'You do not have access to this room' }, { status: 403 })
    }

    const channel = await prisma.channel.findUnique({
      where: { id },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const threadMessages = await listChannelThreadMessages(
      id,
      user ? { id: user.id, type: user.type } : null
    )
    const slicedMessages = threadMessages.slice(offset, offset + limit)

    if (user && access.isMember) {
      await touchChannelReadState(id, user.id, user.type)
    }

    return NextResponse.json({
      messages: slicedMessages,
      pagination: {
        total: threadMessages.length,
        limit,
        offset,
        hasMore: offset + slicedMessages.length < threadMessages.length,
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
    const parentMessageId =
      typeof body.parentMessageId === 'string' && body.parentMessageId.trim()
        ? body.parentMessageId.trim()
        : null

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

    const access = await getChannelAccessForActor(id, { id: user.id, type: user.type })

    if (!access.isMember) {
      return NextResponse.json(
        { error: 'Join this channel before posting' },
        { status: 403 }
      )
    }

    if (access.isMuted) {
      return NextResponse.json(
        { error: 'You are muted in this room right now' },
        { status: 403 }
      )
    }

    const message = await createChannelMessage({
      channelId: id,
      parentMessageId,
      content,
      actor: {
        id: user.id,
        type: user.type,
        name: user.name || null,
      },
      channelType: channel.type,
      channelName: channel.name,
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
