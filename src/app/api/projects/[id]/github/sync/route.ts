import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { requireGithubAccessToken } from '@/lib/github/auth'
import { getOwnedProject } from '@/lib/github/guards'
import { mapProjectDto } from '@/lib/github/mappers'
import { syncProjectGithubState } from '@/lib/github/sync'
import { getGithubSyncBlocker } from '@/lib/projects/transitions'
import { createGithubActivity, createLifecycleEvent } from '@/lib/projects/lifecycle'

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
    const message = error instanceof Error ? error.message : 'Failed to sync GitHub data'
    await prisma.project.updateMany({
      where: { id },
      data: {
        githubSyncStatus: 'error',
      },
    })
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        deliveryStage: true,
        agentGithubStatus: true,
      },
    })

    if (project) {
      await createGithubActivity(prisma, {
        projectId: project.id,
        eventType: 'sync_error',
        title: 'GitHub sync failed',
        status: 'error',
        metadata: {
          message,
        },
      })

      await createLifecycleEvent(prisma, {
        projectId: project.id,
        eventType: 'github_sync_failed',
        title: 'GitHub sync failed',
        description: message,
        deliveryStage: project.deliveryStage,
        agentGithubStatus: project.agentGithubStatus,
        metadata: {
          message,
        },
      })
    }
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 403 : 500 }
    )
  }
}
