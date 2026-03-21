import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { ensureSocialActorExists } from '@/lib/social/follows'
import {
  listConnectionsForActor,
  removeConnection,
  requestConnection,
  respondToConnection,
} from '@/lib/social/connections'
import { createNotification } from '@/lib/social/notifications'
import type { SocialActorType, SocialConnectionStatus, SocialConnectionType } from '@/types/social'

function isActorType(value: string | null): value is SocialActorType {
  return value === 'user' || value === 'bot'
}

function isConnectionType(value: string | null): value is SocialConnectionType {
  return value === 'friend' || value === 'contact'
}

function isStatus(value: string | null): value is SocialConnectionStatus {
  return value === 'pending' || value === 'accepted' || value === 'declined'
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const connectionType = request.nextUrl.searchParams.get('connectionType')
    const status = request.nextUrl.searchParams.get('status')
    const direction = request.nextUrl.searchParams.get('direction')

    const items = await listConnectionsForActor(
      { id: user.id, type: user.type },
      {
        connectionType: isConnectionType(connectionType) ? connectionType : undefined,
        status: isStatus(status) ? status : undefined,
        direction:
          direction === 'incoming' || direction === 'outgoing' || direction === 'all'
            ? direction
            : undefined,
      }
    )

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching connections:', error)
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const targetId = typeof body.targetId === 'string' ? body.targetId : null
    const targetType = typeof body.targetType === 'string' ? body.targetType : null
    const connectionType = typeof body.connectionType === 'string' ? body.connectionType : null

    if (!targetId || !isActorType(targetType) || !isConnectionType(connectionType)) {
      return NextResponse.json(
        { error: 'targetId, targetType, and connectionType are required' },
        { status: 400 }
      )
    }

    const targetExists = await ensureSocialActorExists(targetId, targetType)
    if (!targetExists) {
      return NextResponse.json({ error: 'Target actor not found' }, { status: 404 })
    }

    const connection = await requestConnection(
      { id: user.id, type: user.type },
      { id: targetId, type: targetType },
      connectionType
    )

    await createNotification({
      actorId: targetId,
      actorType: targetType,
      type: 'connection_request',
      title: `${user.name || 'Someone'} sent you a ${connectionType} request`,
      body: 'Open your network workspace to review it.',
      href: '/dashboard/network',
      metadata: connection.id,
    })

    return NextResponse.json({ success: true, id: connection.id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to request connection'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const connectionId = typeof body.connectionId === 'string' ? body.connectionId : null
    const action = body.action === 'decline' ? 'decline' : 'accept'

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 })
    }

    await respondToConnection({ id: user.id, type: user.type }, connectionId, action)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to respond to connection'
    const status = message === 'Connection request not found' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const targetId = typeof body.targetId === 'string' ? body.targetId : null
    const targetType = typeof body.targetType === 'string' ? body.targetType : null
    const connectionType = typeof body.connectionType === 'string' ? body.connectionType : null

    if (!targetId || !isActorType(targetType) || !isConnectionType(connectionType)) {
      return NextResponse.json(
        { error: 'targetId, targetType, and connectionType are required' },
        { status: 400 }
      )
    }

    await removeConnection(
      { id: user.id, type: user.type },
      { id: targetId, type: targetType },
      connectionType
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 })
  }
}
