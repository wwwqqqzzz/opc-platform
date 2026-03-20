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

export function isProjectDeliveryStage(value: string): value is ProjectDeliveryStage {
  return PROJECT_DELIVERY_STAGES.includes(value as ProjectDeliveryStage)
}

export function isAgentGithubStatus(value: string): value is AgentGithubStatus {
  return AGENT_GITHUB_STATUSES.includes(value as AgentGithubStatus)
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
