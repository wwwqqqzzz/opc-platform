import type {
  GithubSyncStatus,
  GithubWorkflowStatus,
  ProjectGithubActivityType,
  ProjectLifecycleEventType,
} from '@/lib/project-stage'

export interface GithubConnection {
  connected: boolean
  login: string | null
  name: string | null
  avatarUrl: string | null
  connectedAt: string | null
  scopes: string[]
}

export interface GithubIntegrationStatus {
  configured: boolean
  missingEnv: string[]
  connection: GithubConnection
  connectedProjectCount: number
  blockingProjectCount: number
  blockingProjects: Array<{
    id: string
    title: string
    githubRepoFullName: string
  }>
}

export interface GithubRepoBinding {
  repoId: string | null
  owner: string | null
  name: string | null
  fullName: string | null
  defaultBranch: string | null
  url: string | null
  installationType: string | null
  connectedAt: string | null
  lastSyncedAt: string | null
  syncStatus: GithubSyncStatus
  workflowStatus: GithubWorkflowStatus
  primaryIssueNumber: number | null
  primaryPrNumber: number | null
}

export interface ProjectGithubActivityDto {
  id: string
  githubEventId: string | null
  eventType: ProjectGithubActivityType
  title: string
  url: string | null
  number: number | null
  status: string | null
  authorLogin: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface ProjectLifecycleEventDto {
  id: string
  eventType: ProjectLifecycleEventType
  title: string
  description: string | null
  deliveryStage: string | null
  agentGithubStatus: string | null
  actorType: string
  actorId: string | null
  actorName: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface ProjectGithubPanelDto {
  connection: GithubRepoBinding
  stats: {
    openIssues: number
    openPullRequests: number
    commitCount: number
    workflowRuns: number
    latestCommitSha: string | null
    latestCommitMessage: string | null
    latestCommitUrl: string | null
  }
  bootstrap: {
    issueNumber: number | null
    issueUrl: string | null
    pullRequestNumber: number | null
    pullRequestUrl: string | null
    branchName: string | null
  }
}
