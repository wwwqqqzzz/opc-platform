import type { Launch, Project } from '@prisma/client'
import { serializeGithubConnection } from '@/lib/github/auth'
import type { ProjectGithubActivityType, ProjectLifecycleEventType } from '@/lib/project-stage'
import type { ProjectGithubActivityRecord, ProjectLifecycleEventRecord } from '@/lib/projects/lifecycle'
import type { ProjectDto } from '@/types/projects'
import type { GithubConnection, ProjectGithubPanelDto } from '@/types/github'

function parseMetadata(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

export function mapLifecycleEvent(event: ProjectLifecycleEventRecord) {
  return {
    id: event.id,
    eventType: event.eventType as ProjectLifecycleEventType,
    title: event.title,
    description: event.description,
    deliveryStage: event.deliveryStage,
    agentGithubStatus: event.agentGithubStatus,
    actorType: event.actorType,
    actorId: event.actorId,
    actorName: event.actorName,
    metadata: parseMetadata(event.metadata),
    createdAt: event.createdAt.toISOString(),
  }
}

export function mapGithubActivity(activity: ProjectGithubActivityRecord) {
  return {
    id: activity.id,
    githubEventId: activity.githubEventId,
    eventType: activity.eventType as ProjectGithubActivityType,
    title: activity.title,
    url: activity.url,
    number: activity.number,
    status: activity.status,
    authorLogin: activity.authorLogin,
    metadata: parseMetadata(activity.metadata),
    createdAt: activity.createdAt.toISOString(),
  }
}

function buildGithubPanel(
  project: {
    id: string
    githubRepoId: string | null
    githubRepoOwner: string | null
    githubRepoName: string | null
    githubRepoFullName: string | null
    githubDefaultBranch: string | null
    githubUrl: string | null
    githubInstallationType: string | null
    githubConnectedAt: Date | null
    githubLastSyncedAt: Date | null
    githubSyncStatus: string
    githubWorkflowStatus: string
    githubPrimaryIssueNumber: number | null
    githubPrimaryPrNumber: number | null
    githubActivities: ProjectGithubActivityRecord[]
  }
): ProjectGithubPanelDto | null {
  if (!project.githubRepoFullName) {
    return null
  }

  const snapshotActivity = project.githubActivities.find((activity) => activity.eventType === 'sync_snapshot')
  const snapshotMetadata = parseMetadata(snapshotActivity?.metadata || null)

  return {
    connection: {
      repoId: project.githubRepoId,
      owner: project.githubRepoOwner,
      name: project.githubRepoName,
      fullName: project.githubRepoFullName,
      defaultBranch: project.githubDefaultBranch,
      url: project.githubUrl,
      installationType: project.githubInstallationType,
      connectedAt: project.githubConnectedAt?.toISOString() || null,
      lastSyncedAt: project.githubLastSyncedAt?.toISOString() || null,
      syncStatus: project.githubSyncStatus as ProjectGithubPanelDto['connection']['syncStatus'],
      workflowStatus: project.githubWorkflowStatus as ProjectGithubPanelDto['connection']['workflowStatus'],
      primaryIssueNumber: project.githubPrimaryIssueNumber,
      primaryPrNumber: project.githubPrimaryPrNumber,
    },
    stats: {
      openIssues: Number(snapshotMetadata?.openIssues || 0),
      openPullRequests: Number(snapshotMetadata?.openPullRequests || 0),
      commitCount: Number(snapshotMetadata?.commitCount || 0),
      workflowRuns: Number(snapshotMetadata?.workflowRuns || 0),
      latestCommitSha: typeof snapshotMetadata?.latestCommitSha === 'string' ? snapshotMetadata.latestCommitSha : null,
      latestCommitMessage:
        typeof snapshotMetadata?.latestCommitMessage === 'string' ? snapshotMetadata.latestCommitMessage : null,
      latestCommitUrl: typeof snapshotMetadata?.latestCommitUrl === 'string' ? snapshotMetadata.latestCommitUrl : null,
    },
    bootstrap: {
      issueNumber: project.githubPrimaryIssueNumber,
      issueUrl:
        project.githubUrl && project.githubPrimaryIssueNumber
          ? `${project.githubUrl}/issues/${project.githubPrimaryIssueNumber}`
          : null,
      pullRequestNumber: project.githubPrimaryPrNumber,
      pullRequestUrl:
        project.githubUrl && project.githubPrimaryPrNumber
          ? `${project.githubUrl}/pull/${project.githubPrimaryPrNumber}`
          : null,
      branchName: project.githubPrimaryPrNumber ? `opc/${project.id}-bootstrap` : null,
    },
  }
}

export function mapProjectDto(
  project: Project & {
    idea: {
      id: string
      title: string
      description: string
      authorType: string
      status: string
    } | null
    launch?: Launch | null
    user: {
      id: string
      email: string
      name: string | null
      githubLogin?: string | null
      githubName?: string | null
      githubAvatarUrl?: string | null
      githubConnectedAt?: Date | null
    } | null
    githubActivities: ProjectGithubActivityRecord[]
    lifecycleEvents: ProjectLifecycleEventRecord[]
  }
): ProjectDto {
  const githubConnection: GithubConnection | null = project.user
    ? serializeGithubConnection({
        githubLogin: project.user.githubLogin || null,
        githubName: project.user.githubName || null,
        githubAvatarUrl: project.user.githubAvatarUrl || null,
        githubConnectedAt: project.user.githubConnectedAt || null,
      })
    : null

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    userId: project.userId,
    ownerName: project.ownerName,
    agentTeam: project.agentTeam,
    githubUrl: project.githubUrl,
    githubRepoFullName: project.githubRepoFullName,
    githubWorkflowStatus: project.githubWorkflowStatus as ProjectDto['githubWorkflowStatus'],
    githubSyncStatus: project.githubSyncStatus as ProjectDto['githubSyncStatus'],
    githubPrimaryIssueNumber: project.githubPrimaryIssueNumber,
    githubPrimaryPrNumber: project.githubPrimaryPrNumber,
    githubLastSyncedAt: project.githubLastSyncedAt?.toISOString() || null,
    githubConnection,
    status: project.status,
    deliveryStage: project.deliveryStage as ProjectDto['deliveryStage'],
    agentGithubStatus: project.agentGithubStatus as ProjectDto['agentGithubStatus'],
    agentGithubUrl: project.agentGithubUrl,
    agentGithubNotes: project.agentGithubNotes,
    handoffRequestedAt: project.handoffRequestedAt?.toISOString() || null,
    handoffCompletedAt: project.handoffCompletedAt?.toISOString() || null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    idea: project.idea
      ? {
          id: project.idea.id,
          title: project.idea.title,
          description: project.idea.description,
          authorType: project.idea.authorType,
          status: project.idea.status,
        }
      : null,
    launch: project.launch
      ? {
          id: project.launch.id,
          productName: project.launch.productName,
          tagline: project.launch.tagline,
          demoUrl: project.launch.demoUrl,
          launchedAt: project.launch.launchedAt.toISOString(),
          githubUrl: project.launch.githubUrl,
        }
      : null,
    user: project.user
      ? {
          id: project.user.id,
          name: project.user.name,
          email: project.user.email,
        }
      : null,
    github: buildGithubPanel(project),
    githubActivity: project.githubActivities.map(mapGithubActivity),
    lifecycle: project.lifecycleEvents.map(mapLifecycleEvent),
  }
}
