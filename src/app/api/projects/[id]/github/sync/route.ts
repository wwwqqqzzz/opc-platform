import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { requireGithubAccessToken } from '@/lib/github/auth'
import { getOwnedProject } from '@/lib/github/guards'
import { mapProjectDto } from '@/lib/github/mappers'
import { syncProjectGithubState } from '@/lib/github/sync'
import { getGithubSyncBlocker } from '@/lib/projects/transitions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const project = await getOwnedProject(id, user.id)
    const syncBlocker = getGithubSyncBlocker(project)
    if (syncBlocker) {
      return NextResponse.json({ error: syncBlocker }, { status: 400 })
    }

    const { accessToken } = await requireGithubAccessToken(user.id)

    await prisma.project.update({
      where: { id: project.id },
      data: {
        githubSyncStatus: 'syncing',
      },
    })

    await syncProjectGithubState(project, accessToken)

    const refreshedProject = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: {
        idea: true,
        launch: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            githubLogin: true,
            githubName: true,
            githubAvatarUrl: true,
            githubConnectedAt: true,
          },
        },
        githubActivities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        lifecycleEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ project: mapProjectDto(refreshedProject) })
  } catch (error) {
    console.error('Failed to sync GitHub project data:', error)
    const { id } = await params
    await prisma.project.updateMany({
      where: { id },
      data: {
        githubSyncStatus: 'error',
      },
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync GitHub data' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 403 : 500 }
    )
  }
}
