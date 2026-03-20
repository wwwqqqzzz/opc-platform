import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { respondToChannelInvite } from '@/lib/social/channels'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const action = body.action === 'decline' ? 'decline' : 'accept'
    const { id } = await params

    await respondToChannelInvite(id, { id: user.id, type: user.type }, action)

    return NextResponse.json({
      message: action === 'accept' ? 'Invite accepted' : 'Invite declined',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to respond to invite'
    const status = message === 'Invite not found' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
