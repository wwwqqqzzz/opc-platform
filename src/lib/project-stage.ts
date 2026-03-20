export const PROJECT_DELIVERY_STAGES = [
  'project',
  'agent_github',
  'launch_ready',
  'launched',
] as const

export type ProjectDeliveryStage = (typeof PROJECT_DELIVERY_STAGES)[number]

export const AGENT_GITHUB_STATUSES = [
  'pending',
  'queued',
  'in_progress',
  'review',
  'blocked',
  'complete',
] as const

export type AgentGithubStatus = (typeof AGENT_GITHUB_STATUSES)[number]

export const GITHUB_WORKFLOW_STATUSES = [
  'not_started',
  'repo_connected',
  'bootstrap_created',
  'in_progress',
  'review',
  'blocked',
  'ready_for_launch',
] as const

export type GithubWorkflowStatus = (typeof GITHUB_WORKFLOW_STATUSES)[number]

export const GITHUB_SYNC_STATUSES = [
  'idle',
  'syncing',
  'error',
  'complete',
] as const

export type GithubSyncStatus = (typeof GITHUB_SYNC_STATUSES)[number]

export const PROJECT_LIFECYCLE_EVENT_TYPES = [
  'project_created',
  'github_repo_connected',
  'github_repo_disconnected',
  'github_bootstrap_started',
  'github_issue_created',
  'github_pr_created',
  'github_progress_detected',
  'github_ready_for_launch',
  'launch_created',
] as const

export type ProjectLifecycleEventType = (typeof PROJECT_LIFECYCLE_EVENT_TYPES)[number]

export const PROJECT_GITHUB_ACTIVITY_TYPES = [
  'issue_opened',
  'issue_updated',
  'pull_request_opened',
  'pull_request_updated',
  'pull_request_merged',
  'push',
  'workflow_run',
  'release',
  'sync_snapshot',
] as const

export type ProjectGithubActivityType = (typeof PROJECT_GITHUB_ACTIVITY_TYPES)[number]

export function isProjectDeliveryStage(value: string): value is ProjectDeliveryStage {
  return PROJECT_DELIVERY_STAGES.includes(value as ProjectDeliveryStage)
}

export function isAgentGithubStatus(value: string): value is AgentGithubStatus {
  return AGENT_GITHUB_STATUSES.includes(value as AgentGithubStatus)
}

export function isGithubWorkflowStatus(value: string): value is GithubWorkflowStatus {
  return GITHUB_WORKFLOW_STATUSES.includes(value as GithubWorkflowStatus)
}

export function isGithubSyncStatus(value: string): value is GithubSyncStatus {
  return GITHUB_SYNC_STATUSES.includes(value as GithubSyncStatus)
}

export const PROJECT_DELIVERY_STAGE_LABELS: Record<ProjectDeliveryStage, string> = {
  project: 'OPC Project',
  agent_github: 'Agent GitHub',
  launch_ready: 'Launch Ready',
  launched: 'Launched',
}

export const AGENT_GITHUB_STATUS_LABELS: Record<AgentGithubStatus, string> = {
  pending: 'Pending',
  queued: 'Queued',
  in_progress: 'In Progress',
  review: 'In Review',
  blocked: 'Blocked',
  complete: 'Complete',
}

export const GITHUB_WORKFLOW_STATUS_LABELS: Record<GithubWorkflowStatus, string> = {
  not_started: 'Not Started',
  repo_connected: 'Repository Connected',
  bootstrap_created: 'Bootstrap Created',
  in_progress: 'In Progress',
  review: 'In Review',
  blocked: 'Blocked',
  ready_for_launch: 'Ready for Launch',
}

export const GITHUB_SYNC_STATUS_LABELS: Record<GithubSyncStatus, string> = {
  idle: 'Idle',
  syncing: 'Syncing',
  error: 'Sync Error',
  complete: 'Synced',
}
