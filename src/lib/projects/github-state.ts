import type { Project } from '@prisma/client'
import type {
  AgentGithubStatus,
  GithubWorkflowStatus,
  ProjectDeliveryStage,
} from '@/lib/project-stage'

export function deriveDeliveryStageFromGithubWorkflowStatus(
  status: GithubWorkflowStatus
): ProjectDeliveryStage {
  if (status === 'ready_for_launch') {
    return 'launch_ready'
  }

  if (status === 'not_started') {
    return 'project'
  }

  return 'agent_github'
}

export function deriveAgentGithubStatusFromGithubWorkflowStatus(
  status: GithubWorkflowStatus
): AgentGithubStatus {
  switch (status) {
    case 'not_started':
      return 'pending'
    case 'repo_connected':
    case 'bootstrap_created':
      return 'queued'
    case 'in_progress':
      return 'in_progress'
    case 'review':
      return 'review'
    case 'blocked':
      return 'blocked'
    case 'ready_for_launch':
      return 'complete'
  }
}

export function isProjectLaunchReady(project: Pick<Project, 'deliveryStage' | 'status'>) {
  return project.status === 'in_progress' && project.deliveryStage === 'launch_ready'
}

export function deriveWorkflowStatusFromSnapshot(input: {
  hasRelease: boolean
  latestMergedPullRequest: boolean
  openPullRequests: number
  recentCommits: number
  openIssues: number
  hasBootstrapArtifacts: boolean
}): GithubWorkflowStatus {
  if (input.hasRelease || input.latestMergedPullRequest) {
    return 'ready_for_launch'
  }

  if (input.openPullRequests > 0) {
    return 'review'
  }

  if (input.recentCommits > 0 || input.openIssues > 0) {
    return 'in_progress'
  }

  if (input.hasBootstrapArtifacts) {
    return 'bootstrap_created'
  }

  return 'repo_connected'
}
