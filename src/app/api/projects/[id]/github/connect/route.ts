import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { requireGithubAccessToken } from '@/lib/github/auth'
import { getOwnedProject } from '@/lib/github/guards'
import { createGithubRepositoryWebhook, getGithubRepository } from '@/lib/github/repos'
import {
  getGithubRepoConnectionBlocker,
  getGithubRepoDisconnectionBlocker,
} from '@/lib/projects/transitions'
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
    const rawRepoOwner = typeof body.repoOwner === 'string' ? body.repoOwner.trim() : ''
    const rawRepoName = typeof body.repoName === 'string' ? body.repoName.trim() : ''
    const [parsedOwner, parsedName] = rawRepoOwner.includes('/') && !rawRepoName
      ? rawRepoOwner.split('/', 2)
      : [rawRepoOwner, rawRepoName]
    const repoOwner = parsedOwner?.trim()
    const repoName = parsedName?.trim()

    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { error: 'Provide both repository owner and repository name, or paste owner/repo into the first field.' },
        { status: 400 }
      )
    }

    if (!/^[A-Za-z0-9_.-]+$/.test(repoOwner) || !/^[A-Za-z0-9_.-]+$/.test(repoName)) {
      return NextResponse.json(
        { error: 'Repository owner and name may only contain letters, numbers, dots, underscores, and hyphens.' },
        { status: 400 }
      )
    }

    const project = await getOwnedProject(id, user.id)
    const connectionBlocker = getGithubRepoConnectionBlocker(project)
    if (connectionBlocker) {
      return NextResponse.json(
        { error: connectionBlocker },
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const project = await getOwnedProject(id, user.id)
    const disconnectionBlocker = getGithubRepoDisconnectionBlocker(project)
    if (disconnectionBlocker) {
      return NextResponse.json({ error: disconnectionBlocker }, { status: 400 })
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        githubRepoId: null,
        githubRepoOwner: null,
        githubRepoName: null,
        githubRepoFullName: null,
        githubDefaultBranch: null,
        githubInstallationType: null,
        githubConnectedAt: null,
        githubLastSyncedAt: null,
        githubSyncStatus: 'idle',
        githubWorkflowStatus: 'not_started',
        githubUrl: null,
        deliveryStage: 'project',
        agentGithubStatus: 'pending',
        agentGithubUrl: null,
        handoffRequestedAt: null,
        handoffCompletedAt: null,
      },
    })

    await prisma.projectGithubActivity.deleteMany({
      where: {
        projectId: project.id,
      },
    })

    await createLifecycleEvent(prisma, {
      projectId: project.id,
      eventType: 'github_repo_disconnected',
      title: 'GitHub repository disconnected',
      description: `Disconnected ${project.githubRepoFullName} before bootstrap started.`,
      deliveryStage: 'project',
      agentGithubStatus: 'pending',
      actorType: 'user',
      actorId: user.id,
      actorName: user.name || user.email,
      metadata: {
        previousRepoFullName: project.githubRepoFullName,
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
      message: 'GitHub repository disconnected.',
    })
  } catch (error) {
    console.error('Failed to disconnect GitHub repository:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect GitHub repository' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 403 : 500 }
    )
  }
}
