import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { deleteChannelMessage } from '@/lib/social/channel-messages'

interface RouteContext {
  params: Promise<{
    id: string
    messageId: string
  }>
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const { id, messageId } = await params
    await deleteChannelMessage(id, messageId, { id: user.id, type: user.type })

    return NextResponse.json({ message: 'Message removed successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove message'
    const status =
      message === 'Message not found'
        ? 404
        : message === 'You do not have permission to delete this message'
        ? 403
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}
