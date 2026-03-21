import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'
import {
  canActorCreateChannelType,
  getChannelAccessForActor,
} from '@/lib/social/channels'
import type { ChannelType, ChannelVisibility } from '@/types/channels'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

function isChannelType(value: string): value is ChannelType {
  return value === 'human' || value === 'bot' || value === 'mixed' || value === 'announcement'
}

function isVisibility(value: string): value is ChannelVisibility {
  return value === 'open' || value === 'invite_only' || value === 'private'
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { user } = await authenticateRequest(request)
    const { id } = await params
    const access = await getChannelAccessForActor(id, user ? { id: user.id, type: user.type } : null)

    if (!access.canView) {
      return NextResponse.json({ error: 'You do not have access to this room' }, { status: 403 })
    }

    const channel = await prisma.channel.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        visibility: true,
        description: true,
        order: true,
        isActive: true,
      },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    return NextResponse.json({
      channel,
      access,
    })
  } catch (error) {
    console.error('Error fetching channel settings:', error)
    return NextResponse.json({ error: 'Failed to fetch room details' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const access = await getChannelAccessForActor(id, { id: user.id, type: user.type })

    if (!access.canManage) {
      return NextResponse.json({ error: 'Only room owners and moderators can update this room' }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const description = typeof body.description === 'string' ? body.description.trim() : undefined
    const visibility = typeof body.visibility === 'string' ? body.visibility : undefined
    const type = typeof body.type === 'string' ? body.type : undefined
    const order = typeof body.order === 'number' ? body.order : undefined

    if (type && (!isChannelType(type) || !canActorCreateChannelType(user.type, type))) {
      return NextResponse.json({ error: 'This actor type cannot set this room type' }, { status: 403 })
    }

    if (visibility && !isVisibility(visibility)) {
      return NextResponse.json({ error: 'Invalid room visibility' }, { status: 400 })
    }

    if (access.membershipRole !== 'owner' && (name || visibility || type)) {
      return NextResponse.json(
        { error: 'Only room owners can change the name, type, or visibility' },
        { status: 403 }
      )
    }

    const channel = await prisma.channel.update({
      where: { id },
      data: {
        name,
        description: description === '' ? null : description,
        visibility,
        type,
        order,
      },
      select: {
        id: true,
        name: true,
        type: true,
        visibility: true,
        description: true,
        order: true,
        isActive: true,
      },
    })

    return NextResponse.json({
      message: 'Room updated successfully',
      channel,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update room'
    const status = message === 'Channel not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const access = await getChannelAccessForActor(id, { id: user.id, type: user.type })

    if (access.membershipRole !== 'owner') {
      return NextResponse.json({ error: 'Only room owners can delete rooms' }, { status: 403 })
    }

    await prisma.channel.update({
      where: { id },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({ message: 'Room archived successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to archive room'
    const status = message === 'Channel not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
