import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        githubId: null,
        githubLogin: null,
        githubName: null,
        githubAvatarUrl: null,
        githubAccessToken: null,
        githubRefreshToken: null,
        githubTokenExpiresAt: null,
        githubConnectedAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect GitHub:', error)
    return NextResponse.json({ error: 'Failed to disconnect GitHub' }, { status: 500 })
  }
}
