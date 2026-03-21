import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import {
  getChannelAccessForActor,
  listChannelMembers,
  removeChannelMember,
  setChannelMemberMute,
} from '@/lib/social/channels'
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

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { user } = await authenticateRequest(request)
    const { id } = await params
    const access = await getChannelAccessForActor(id, user ? { id: user.id, type: user.type } : null)

    if (!access.canView) {
      return NextResponse.json({ error: 'You do not have access to this room' }, { status: 403 })
    }

    const members = await listChannelMembers(id)

    return NextResponse.json({
      members,
    })
  } catch (error) {
    console.error('Error fetching channel members:', error)
    return NextResponse.json({ error: 'Failed to fetch channel members' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const targetActorId = typeof body.targetActorId === 'string' ? body.targetActorId : null
    const targetActorType = typeof body.targetActorType === 'string' ? body.targetActorType : null
    const action = typeof body.action === 'string' ? body.action : null
    const hours = typeof body.hours === 'number' ? body.hours : 1

    if (!targetActorId || !isActorType(targetActorType) || !['mute', 'unmute'].includes(action || '')) {
      return NextResponse.json(
        { error: 'targetActorId, targetActorType, and valid action are required' },
        { status: 400 }
      )
    }

    const { id } = await params
    const mutedUntil = action === 'mute' ? new Date(Date.now() + Math.max(hours, 1) * 60 * 60 * 1000) : null
    const membership = await setChannelMemberMute(
      id,
      targetActorId,
      targetActorType,
      { id: user.id, type: user.type },
      mutedUntil
    )

    await createNotification({
      actorId: targetActorId,
      actorType: targetActorType,
      type: 'channel_member_muted',
      title: action === 'mute' ? 'You were muted in a room' : 'Your room mute was lifted',
      body:
        action === 'mute'
          ? `You cannot post in this room until ${mutedUntil?.toLocaleString()}.`
          : 'You can post in this room again.',
      href: '/dashboard/channels',
      metadata: membership.channelId,
    }).catch(() => null)

    return NextResponse.json({
      message: action === 'mute' ? 'Member muted successfully' : 'Member unmuted successfully',
      mutedUntil: membership.mutedUntil?.toISOString() || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update member state'
    const status =
      message === 'Channel not found' || message === 'Target member not found'
        ? 404
        : message === 'Only room owners and moderators can manage members' ||
          message === 'Room owners cannot be muted' ||
          message === 'Only room owners can mute moderators'
        ? 403
        : 400

    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const targetActorId = typeof body.targetActorId === 'string' ? body.targetActorId : null
    const targetActorType = typeof body.targetActorType === 'string' ? body.targetActorType : null

    if (!targetActorId || !isActorType(targetActorType)) {
      return NextResponse.json(
        { error: 'targetActorId and targetActorType are required' },
        { status: 400 }
      )
    }

    const { id } = await params
    await removeChannelMember(id, targetActorId, targetActorType, { id: user.id, type: user.type })

    await createNotification({
      actorId: targetActorId,
      actorType: targetActorType,
      type: 'channel_member_removed',
      title: 'You were removed from a room',
      body: 'Open your channel workspace to review current memberships.',
      href: '/dashboard/channels',
      metadata: id,
    }).catch(() => null)

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove member'
    const status =
      message === 'Channel not found' || message === 'Target member not found'
        ? 404
        : message === 'Only room owners and moderators can manage members' ||
          message === 'Room owners cannot be removed' ||
          message === 'Only room owners can remove moderators'
        ? 403
        : 400

    return NextResponse.json({ error: message }, { status })
  }
}
