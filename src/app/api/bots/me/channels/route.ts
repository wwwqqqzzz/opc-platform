import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import {
  joinChannel,
  leaveChannel,
  listPendingInvitesForActor,
  listVisibleChannelsForActor,
} from '@/lib/social/channels'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    if (user.type !== 'bot') {
      return NextResponse.json({ error: 'This endpoint is for bots only' }, { status: 403 })
    }

    const [channels, invites] = await Promise.all([
      listVisibleChannelsForActor({ id: user.id, type: 'bot' }),
      listPendingInvitesForActor(user.id, 'bot'),
    ])

    return NextResponse.json({
      bot: {
        id: user.id,
        name: user.name,
      },
      channels,
      invites,
    })
  } catch (error) {
    console.error('Error fetching bot channel control surface:', error)
    return NextResponse.json({ error: 'Failed to fetch bot channels' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    if (user.type !== 'bot') {
      return NextResponse.json({ error: 'This endpoint is for bots only' }, { status: 403 })
    }

    const body = await request.json()
    const channelId = typeof body.channelId === 'string' ? body.channelId : null
    const action = typeof body.action === 'string' ? body.action : 'join'

    if (!channelId || !['join', 'leave'].includes(action)) {
      return NextResponse.json({ error: 'channelId and valid action are required' }, { status: 400 })
    }

    if (action === 'join') {
      const membership = await joinChannel(channelId, user.id, 'bot')
      return NextResponse.json({
        message: 'Bot joined room successfully',
        membership: {
          joinedAt: membership.joinedAt.toISOString(),
          role: membership.role,
        },
      })
    }

    await leaveChannel(channelId, user.id, 'bot')
    return NextResponse.json({ message: 'Bot left room successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update bot room state'
    const status =
      message === 'Channel not found'
        ? 404
        : message === 'This actor type cannot join this channel' ||
          message === 'This room requires an invite' ||
          message === 'Channel owners cannot leave their own room'
        ? 403
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
