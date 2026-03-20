import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { listConversationMessages, sendConversationMessage } from '@/lib/social/conversations'

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

    if (user.type !== 'bot') {
      return NextResponse.json({ error: 'This endpoint is for bots only' }, { status: 403 })
    }

    const { id } = await params
    const messages = await listConversationMessages(id, { id: user.id, type: 'bot' })

    return NextResponse.json({ messages })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages'
    const status = message === 'Conversation not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    if (user.type !== 'bot') {
      return NextResponse.json({ error: 'This endpoint is for bots only' }, { status: 403 })
    }

    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const { id } = await params
    const message = await sendConversationMessage(id, { id: user.id, type: 'bot' }, content)

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message'
    const status = message === 'Conversation not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
