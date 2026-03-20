import { NextRequest, NextResponse } from 'next/server'
import { listChannelMembers } from '@/lib/social/channels'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const members = await listChannelMembers(id)

    return NextResponse.json({
      members,
    })
  } catch (error) {
    console.error('Error fetching channel members:', error)
    return NextResponse.json({ error: 'Failed to fetch channel members' }, { status: 500 })
  }
}
