import crypto from 'crypto'
import type { GithubWorkflowStatus } from '@/lib/project-stage'
import { deriveAgentGithubStatusFromGithubWorkflowStatus, deriveDeliveryStageFromGithubWorkflowStatus } from '@/lib/projects/github-state'

export function verifyGithubWebhookSignature(payload: string, signature: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('GitHub webhook secret is not configured')
  }

  if (!signature) {
    return false
  }

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`
  if (expected.length !== signature.length) {
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export function deriveGithubWorkflowStatusFromWebhookEvent(
  event: string,
  payload: Record<string, unknown>
): GithubWorkflowStatus | null {
  if (event === 'release') {
    return 'ready_for_launch'
  }

  if (event === 'workflow_run') {
    const workflowRun = payload.workflow_run as { status?: string; conclusion?: string | null } | undefined
    if (workflowRun?.conclusion === 'success') {
      return 'in_progress'
    }
    if (workflowRun?.conclusion === 'failure') {
      return 'blocked'
    }
  }

  if (event === 'push') {
    return 'in_progress'
  }

  if (event === 'pull_request' || event === 'pull_request_review') {
    const pullRequest = payload.pull_request as { merged_at?: string | null; state?: string } | undefined
    if (pullRequest?.merged_at) {
      return 'ready_for_launch'
    }
    return 'review'
  }

  if (event === 'issues') {
    return 'in_progress'
  }

  return null
}

export function getProjectStateFromWorkflowStatus(status: GithubWorkflowStatus) {
  return {
    githubWorkflowStatus: status,
    deliveryStage: deriveDeliveryStageFromGithubWorkflowStatus(status),
    agentGithubStatus: deriveAgentGithubStatusFromGithubWorkflowStatus(status),
  }
}
