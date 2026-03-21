import type { GithubConnection, ProjectGithubActivityDto, ProjectGithubPanelDto, ProjectLifecycleEventDto } from '@/types/github'
import type { AgentGithubStatus, GithubSyncStatus, GithubWorkflowStatus, ProjectDeliveryStage } from '@/lib/project-stage'

export interface ProjectSourcePostSummary {
  id: string
  title: string
  description: string
  authorType: string
  status: string
}

export interface ProjectLaunchSummary {
  id: string
  productName: string
  tagline: string | null
  demoUrl: string | null
  launchedAt: string
  githubUrl: string | null
}

export interface ProjectOwnerSummary {
  id: string
  name: string | null
  email: string
}

export interface ProjectDto {
  id: string
  title: string
  description: string | null
  userId: string | null
  ownerName: string | null
  agentTeam: string | null
  githubUrl: string | null
  githubRepoFullName: string | null
  githubWorkflowStatus: GithubWorkflowStatus
  githubSyncStatus: GithubSyncStatus
  githubPrimaryIssueNumber: number | null
  githubPrimaryPrNumber: number | null
  githubLastSyncedAt: string | null
  githubConnection: GithubConnection | null
  status: string
  deliveryStage: ProjectDeliveryStage
  agentGithubStatus: AgentGithubStatus
  agentGithubUrl: string | null
  agentGithubNotes: string | null
  handoffRequestedAt: string | null
  handoffCompletedAt: string | null
  createdAt: string
  updatedAt: string
  sourcePost: ProjectSourcePostSummary | null
  launch: ProjectLaunchSummary | null
  user: ProjectOwnerSummary | null
  github: ProjectGithubPanelDto | null
  githubActivity: ProjectGithubActivityDto[]
  lifecycle: ProjectLifecycleEventDto[]
}
