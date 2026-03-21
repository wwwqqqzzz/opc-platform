import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import {
  listNotificationsForActor,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/social/notifications'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
    const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true'
    const type = request.nextUrl.searchParams.get('type') || undefined
    const notifications = await listNotificationsForActor(user.id, user.type, limit, { unreadOnly, type })

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const action = typeof body.action === 'string' ? body.action : 'markOne'

    if (action === 'markAllRead') {
      await markAllNotificationsRead({ id: user.id, type: user.type })
      return NextResponse.json({ message: 'All notifications marked as read' })
    }

    const id = typeof body.id === 'string' ? body.id : null
    if (!id) {
      return NextResponse.json({ error: 'Notification id is required' }, { status: 400 })
    }

    await markNotificationRead(id, { id: user.id, type: user.type })

    return NextResponse.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
