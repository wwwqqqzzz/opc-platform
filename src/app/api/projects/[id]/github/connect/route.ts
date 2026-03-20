import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { requireGithubAccessToken } from '@/lib/github/auth'
import { getOwnedProject } from '@/lib/github/guards'
import { createGithubRepositoryWebhook, getGithubRepository } from '@/lib/github/repos'
import { canConnectGithubRepo } from '@/lib/projects/transitions'
import { createLifecycleEvent } from '@/lib/projects/lifecycle'
import { mapProjectDto } from '@/lib/github/mappers'

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
    const body = await request.json()
    const { repoOwner, repoName } = body as { repoOwner?: string; repoName?: string }

    if (!repoOwner || !repoName) {
      return NextResponse.json({ error: 'repoOwner and repoName are required' }, { status: 400 })
    }

    const project = await getOwnedProject(id, user.id)
    if (!canConnectGithubRepo(project)) {
      return NextResponse.json(
        { error: 'This project can no longer change its connected repository.' },
        { status: 400 }
      )
    }

    const { accessToken } = await requireGithubAccessToken(user.id)
    const repository = await getGithubRepository(accessToken, repoOwner, repoName)

    let webhookStatus: string | null = null
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    if (webhookSecret) {
      try {
        const webhookUrl = `${request.nextUrl.origin}/api/integrations/github/webhook`
        await createGithubRepositoryWebhook(
          accessToken,
          repoOwner,
          repoName,
          webhookUrl,
          webhookSecret
        )
        webhookStatus = 'registered'
      } catch (error) {
        console.error('Failed to create GitHub webhook, falling back to manual sync:', error)
        webhookStatus = 'manual_sync_only'
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: {
        githubRepoId: String(repository.id),
        githubRepoOwner: repository.owner.login,
        githubRepoName: repository.name,
        githubRepoFullName: repository.full_name,
        githubDefaultBranch: repository.default_branch,
        githubInstallationType: 'oauth',
        githubConnectedAt: new Date(),
        githubLastSyncedAt: null,
        githubSyncStatus: 'idle',
        githubWorkflowStatus: 'repo_connected',
        githubUrl: repository.html_url,
        deliveryStage: 'agent_github',
        agentGithubStatus: 'queued',
        agentGithubUrl: repository.html_url,
        handoffRequestedAt: project.handoffRequestedAt || new Date(),
      },
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

    await createLifecycleEvent(prisma, {
      projectId: project.id,
      eventType: 'github_repo_connected',
      title: 'GitHub repository connected',
      description: `Connected ${repository.full_name} to this project.`,
      deliveryStage: updatedProject.deliveryStage,
      agentGithubStatus: updatedProject.agentGithubStatus,
      actorType: 'user',
      actorId: user.id,
      actorName: user.name || user.email,
      metadata: {
        repoFullName: repository.full_name,
        repoUrl: repository.html_url,
        webhookStatus,
      },
    })

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

    return NextResponse.json({
      project: mapProjectDto(refreshedProject),
      warnings:
        webhookStatus === 'manual_sync_only'
          ? ['GitHub webhook could not be registered automatically. Manual sync is available as a fallback.']
          : [],
    })
  } catch (error) {
    console.error('Failed to connect GitHub repository:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect GitHub repository' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 403 : 500 }
    )
  }
}
