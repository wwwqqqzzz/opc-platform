import { NextRequest, NextResponse } from 'next/server'
import { requireBotSurfaceActor } from '@/lib/social/bot-surface'
import {
  listNotificationsForActor,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/social/notifications'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireBotSurfaceActor(request)
    if (!auth.actor) {
      return NextResponse.json(
        { error: auth.response?.error || 'Unauthorized' },
        { status: auth.response?.status || 401 }
      )
    }

    const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
    const notifications = await listNotificationsForActor(auth.actor.id, 'bot', limit)

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
    })
  } catch (error) {
    console.error('Error fetching bot notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch bot notifications' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireBotSurfaceActor(request)
    if (!auth.actor) {
      return NextResponse.json(
        { error: auth.response?.error || 'Unauthorized' },
        { status: auth.response?.status || 401 }
      )
    }

    const body = await request.json()
    const action = typeof body.action === 'string' ? body.action : 'markOne'

    if (action === 'markAllRead') {
      await markAllNotificationsRead(auth.actor)
      return NextResponse.json({ message: 'All notifications marked as read' })
    }

    const id = typeof body.id === 'string' ? body.id : null
    if (!id) {
      return NextResponse.json({ error: 'Notification id is required' }, { status: 400 })
    }

    await markNotificationRead(id, auth.actor)
    return NextResponse.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.error('Error updating bot notifications:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
