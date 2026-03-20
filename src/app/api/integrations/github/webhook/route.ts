import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createGithubActivity, createLifecycleEvent } from '@/lib/projects/lifecycle'
import { deriveGithubWorkflowStatusFromWebhookEvent, getProjectStateFromWorkflowStatus, verifyGithubWebhookSignature } from '@/lib/github/webhooks'

function buildActivityTitle(event: string, payload: Record<string, unknown>) {
  if (event === 'push') {
    return `Push received on ${(payload.ref as string | undefined)?.replace('refs/heads/', '') || 'repository'}`
  }

  if (event === 'issues') {
    const issue = payload.issue as { title?: string; number?: number } | undefined
    return `Issue #${issue?.number || ''} updated: ${issue?.title || 'GitHub issue'}`
  }

  if (event === 'pull_request' || event === 'pull_request_review') {
    const pullRequest = payload.pull_request as { title?: string; number?: number } | undefined
    return `Pull request #${pullRequest?.number || ''}: ${pullRequest?.title || 'GitHub PR'}`
  }

  if (event === 'workflow_run') {
    const workflowRun = payload.workflow_run as { name?: string } | undefined
    return `Workflow run updated: ${workflowRun?.name || 'GitHub Actions'}`
  }

  if (event === 'release') {
    const release = payload.release as { tag_name?: string } | undefined
    return `Release published: ${release?.tag_name || 'GitHub release'}`
  }

  return `GitHub ${event} event received`
}

export async function POST(request: NextRequest) {
  const payloadText = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  const event = request.headers.get('x-github-event') || 'unknown'
  const deliveryId = request.headers.get('x-github-delivery')
  let projectId: string | null = null

  try {
    if (!verifyGithubWebhookSignature(payloadText, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(payloadText) as Record<string, unknown>
    const repository = payload.repository as { full_name?: string; html_url?: string } | undefined
    if (!repository?.full_name) {
      return NextResponse.json({ ignored: true })
    }

    const project = await prisma.project.findFirst({
      where: { githubRepoFullName: repository.full_name },
    })

    if (!project) {
      return NextResponse.json({ ignored: true })
    }

    projectId = project.id

    const sender = payload.sender as { login?: string } | undefined
    const issue = payload.issue as { number?: number; html_url?: string; state?: string } | undefined
    const pullRequest = payload.pull_request as {
      number?: number
      html_url?: string
      state?: string
      merged_at?: string | null
    } | undefined
    const workflowRun = payload.workflow_run as { html_url?: string; status?: string; conclusion?: string | null } | undefined
    const release = payload.release as { html_url?: string; tag_name?: string } | undefined

    await createGithubActivity(prisma, {
      projectId: project.id,
      githubEventId: deliveryId,
      eventType:
        event === 'pull_request_review'
          ? 'pull_request_updated'
          : event === 'pull_request'
          ? pullRequest?.merged_at
            ? 'pull_request_merged'
            : 'pull_request_opened'
          : event === 'issues'
          ? 'issue_updated'
          : event === 'workflow_run'
          ? 'workflow_run'
          : event === 'release'
          ? 'release'
          : 'push',
      title: buildActivityTitle(event, payload),
      url:
        pullRequest?.html_url ||
        issue?.html_url ||
        workflowRun?.html_url ||
        release?.html_url ||
        repository.html_url ||
        null,
      number: pullRequest?.number || issue?.number || null,
      status: pullRequest?.state || issue?.state || workflowRun?.status || null,
      authorLogin: sender?.login || null,
      metadata: payload,
    })

    const workflowStatus = deriveGithubWorkflowStatusFromWebhookEvent(event, payload)
    if (workflowStatus) {
      const nextState = getProjectStateFromWorkflowStatus(workflowStatus)
      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          githubWorkflowStatus: nextState.githubWorkflowStatus,
          deliveryStage: nextState.deliveryStage,
          agentGithubStatus: nextState.agentGithubStatus,
          githubLastSyncedAt: new Date(),
          githubSyncStatus: 'complete',
          handoffRequestedAt:
            nextState.deliveryStage === 'project'
              ? project.handoffRequestedAt
              : project.handoffRequestedAt || new Date(),
          handoffCompletedAt:
            nextState.deliveryStage === 'launch_ready'
              ? project.handoffCompletedAt || new Date()
              : project.handoffCompletedAt,
        },
      })

      if (workflowStatus === 'in_progress' || workflowStatus === 'review') {
        await createLifecycleEvent(prisma, {
          projectId: project.id,
          eventType: 'github_progress_detected',
          title: 'GitHub activity moved the project forward',
          description: buildActivityTitle(event, payload),
          deliveryStage: updatedProject.deliveryStage,
          agentGithubStatus: updatedProject.agentGithubStatus,
          metadata: payload,
        })
      }

      if (workflowStatus === 'ready_for_launch') {
        await createLifecycleEvent(prisma, {
          projectId: project.id,
          eventType: 'github_ready_for_launch',
          title: 'GitHub workflow reached launch-ready state',
          description: buildActivityTitle(event, payload),
          deliveryStage: updatedProject.deliveryStage,
          agentGithubStatus: updatedProject.agentGithubStatus,
          metadata: payload,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('GitHub webhook failed:', error)
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          deliveryStage: true,
          agentGithubStatus: true,
        },
      })

      if (project) {
        const message = error instanceof Error ? error.message : 'Failed to process GitHub webhook'
        await prisma.project.update({
          where: { id: project.id },
          data: {
            githubSyncStatus: 'error',
          },
        })

        await createGithubActivity(prisma, {
          projectId: project.id,
          githubEventId: deliveryId,
          eventType: 'sync_error',
          title: `GitHub webhook failed: ${event}`,
          status: 'error',
          metadata: {
            message,
            event,
          },
        })

        await createLifecycleEvent(prisma, {
          projectId: project.id,
          eventType: 'github_sync_failed',
          title: 'GitHub webhook processing failed',
          description: message,
          deliveryStage: project.deliveryStage,
          agentGithubStatus: project.agentGithubStatus,
          metadata: {
            event,
            deliveryId,
            message,
          },
        })
      }
    }
    return NextResponse.json({ error: 'Failed to process GitHub webhook' }, { status: 500 })
  }
}
