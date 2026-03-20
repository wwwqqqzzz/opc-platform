import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { inviteActorToChannel } from '@/lib/social/channels'
import { createNotification } from '@/lib/social/notifications'
import type { ChannelActorType } from '@/types/channels'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

function isActorType(value: string | null): value is ChannelActorType {
  return value === 'user' || value === 'bot'
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const invitedActorId = typeof body.invitedActorId === 'string' ? body.invitedActorId : null
    const invitedActorType = typeof body.invitedActorType === 'string' ? body.invitedActorType : null

    if (!invitedActorId || !isActorType(invitedActorType)) {
      return NextResponse.json(
        { error: 'invitedActorId and invitedActorType are required' },
        { status: 400 }
      )
    }

    const { id } = await params
    const invite = await inviteActorToChannel(id, invitedActorId, invitedActorType, {
      id: user.id,
      type: user.type,
    })

    await createNotification({
      actorId: invitedActorId,
      actorType: invitedActorType,
      type: 'channel_invite',
      title: `${user.name || 'Someone'} invited you to a room`,
      body: 'Open your dashboard channels workspace to accept or decline the invite.',
      href: '/dashboard/channels',
      metadata: invite.channelId,
    })

    return NextResponse.json({
      message: 'Invite sent successfully',
      inviteId: invite.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to invite actor'
    const status =
      message === 'Channel not found' || message === 'Invited actor not found'
        ? 404
        : message === 'Only room owners and moderators can invite members' ||
          message === 'This actor type cannot join this room'
        ? 403
        : 400
    return NextResponse.json({ error: message }, { status })
  }
}
