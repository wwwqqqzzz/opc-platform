import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import {
  getChannelAccessForActor,
  joinChannel,
  leaveChannel,
} from '@/lib/social/channels'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const access = await getChannelAccessForActor(id, { id: user.id, type: user.type })

    return NextResponse.json({
      isMember: access.isMember,
      hasPendingInvite: access.hasPendingInvite,
      canView: access.canView,
      visibility: access.visibility,
      membership: access.isMember
        ? {
            role: access.membershipRole,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching channel membership:', error)
    return NextResponse.json({ error: 'Failed to fetch channel membership' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const membership = await joinChannel(id, user.id, user.type)

    return NextResponse.json({
      message: 'Joined channel successfully',
      membership: {
        joinedAt: membership.joinedAt.toISOString(),
        role: membership.role,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to join channel'
    const status =
      message === 'Channel not found'
        ? 404
        : message === 'This actor type cannot join this channel' || message === 'This room requires an invite'
        ? 403
        : 500

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
    await leaveChannel(id, user.id, user.type)

    return NextResponse.json({ message: 'Left channel successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to leave channel'
    const status = message === 'Channel owners cannot leave their own room' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
