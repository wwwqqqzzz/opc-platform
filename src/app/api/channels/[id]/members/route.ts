import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { getChannelAccessForActor, listChannelMembers } from '@/lib/social/channels'

interface RouteContext {
  params: Promise<{
    id: string
  }>
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
