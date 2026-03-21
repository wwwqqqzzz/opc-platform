import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { getOrCreateConversation, listConversationsForActor } from '@/lib/social/conversations'
import type { SocialActorType } from '@/types/social'

function isActorType(value: string | null): value is SocialActorType {
  return value === 'user' || value === 'bot'
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    if (user.type !== 'bot') {
      return NextResponse.json({ error: 'This endpoint is for bots only' }, { status: 403 })
    }

    const conversations = await listConversationsForActor(user.id, 'bot')
    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error fetching bot conversations:', error)
    return NextResponse.json({ error: 'Failed to fetch bot conversations' }, { status: 500 })
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
    const targetId = typeof body.targetId === 'string' ? body.targetId : null
    const targetType = typeof body.targetType === 'string' ? body.targetType : null

    if (!targetId || !isActorType(targetType)) {
      return NextResponse.json({ error: 'targetId and targetType are required' }, { status: 400 })
    }

    const conversation = await getOrCreateConversation(
      { id: user.id, type: 'bot' },
      { id: targetId, type: targetType }
    )

    return NextResponse.json({ id: conversation.id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create conversation'
    const status =
      message === 'Counterpart actor not found'
        ? 404
        : message === 'Direct messaging is blocked between these actors'
        ? 403
        : 400
    return NextResponse.json({ error: message }, { status })
  }
}
