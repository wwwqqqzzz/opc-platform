import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { listPendingInvitesForActor } from '@/lib/social/channels'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const invites = await listPendingInvitesForActor(user.id, user.type)

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Error fetching channel invites:', error)
    return NextResponse.json({ error: 'Failed to fetch channel invites' }, { status: 500 })
  }
}
