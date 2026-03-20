import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connectedProjects = await prisma.project.findMany({
      where: {
        userId: user.id,
        githubRepoFullName: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        githubRepoFullName: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
    })

    if (connectedProjects.length > 0) {
      return NextResponse.json(
        {
          error: 'Disconnect GitHub after unbinding or completing the projects that still rely on it.',
          blockingProjects: connectedProjects.map((project) => ({
            id: project.id,
            title: project.title,
            githubRepoFullName: project.githubRepoFullName,
          })),
        },
        { status: 409 }
      )
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
