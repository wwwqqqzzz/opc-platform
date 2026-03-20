import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { setChannelModerator } from '@/lib/social/channels'
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

async function updateModerator(
  request: NextRequest,
  params: RouteContext['params'],
  makeModerator: boolean
) {
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

  try {
    const { id } = await params
    const membership = await setChannelModerator(
      id,
      targetActorId,
      targetActorType,
      { id: user.id, type: user.type },
      makeModerator
    )

    await createNotification({
      actorId: targetActorId,
      actorType: targetActorType,
      type: 'channel_role_updated',
      title: makeModerator ? 'You were promoted to moderator' : 'Your moderator role was removed',
      body: 'Open the room to see your current permissions.',
      href: `/dashboard/channels`,
      metadata: membership.channelId,
    })

    return NextResponse.json({
      message: makeModerator ? 'Moderator promoted' : 'Moderator removed',
      role: membership.role,
    })
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to update moderator'
    const status =
      message === 'Channel not found' || message === 'Target member not found'
        ? 404
        : message === 'Only room owners can manage moderators' ||
          message === 'Room ownership cannot be changed here'
        ? 403
        : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  return updateModerator(request, context.params, true)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return updateModerator(request, context.params, false)
}
