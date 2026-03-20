import type { Project } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  listGithubCommits,
  listGithubIssues,
  listGithubMergedPullRequests,
  listGithubPullRequests,
  listGithubReleases,
  listGithubWorkflowRuns,
} from '@/lib/github/repos'
import { deriveWorkflowStatusFromSnapshot, deriveAgentGithubStatusFromGithubWorkflowStatus, deriveDeliveryStageFromGithubWorkflowStatus } from '@/lib/projects/github-state'
import { createGithubActivity, createLifecycleEvent } from '@/lib/projects/lifecycle'

export interface GithubSyncSnapshot {
  openIssues: number
  openPullRequests: number
  commitCount: number
  workflowRuns: number
  latestCommitSha: string | null
  latestCommitMessage: string | null
  latestCommitUrl: string | null
  latestMergedPullRequestUrl: string | null
  latestReleaseUrl: string | null
}

export async function syncProjectGithubState(project: Project, accessToken: string) {
  if (!project.githubRepoOwner || !project.githubRepoName) {
    throw new Error('Project repository is not connected')
  }

  const [commits, issues, pullRequests, mergedPullRequests, workflowRuns, releases] = await Promise.all([
    listGithubCommits(accessToken, project.githubRepoOwner, project.githubRepoName),
    listGithubIssues(accessToken, project.githubRepoOwner, project.githubRepoName),
    listGithubPullRequests(accessToken, project.githubRepoOwner, project.githubRepoName),
    listGithubMergedPullRequests(accessToken, project.githubRepoOwner, project.githubRepoName).catch(() => []),
    listGithubWorkflowRuns(accessToken, project.githubRepoOwner, project.githubRepoName).catch(() => []),
    listGithubReleases(accessToken, project.githubRepoOwner, project.githubRepoName).catch(() => []),
  ])

  const openIssues = issues.filter((issue) => !issue.pull_request)
  const snapshot: GithubSyncSnapshot = {
    openIssues: openIssues.length,
    openPullRequests: pullRequests.length,
    commitCount: commits.length,
    workflowRuns: workflowRuns.length,
    latestCommitSha: commits[0]?.sha || null,
    latestCommitMessage: commits[0]?.commit.message || null,
    latestCommitUrl: commits[0]?.html_url || null,
    latestMergedPullRequestUrl: mergedPullRequests[0]?.html_url || null,
    latestReleaseUrl: releases[0]?.html_url || null,
  }

  const workflowStatus = deriveWorkflowStatusFromSnapshot({
    hasRelease: Boolean(releases[0]),
    latestMergedPullRequest: Boolean(mergedPullRequests[0]),
    openPullRequests: pullRequests.length,
    recentCommits: commits.length,
    openIssues: openIssues.length,
    hasBootstrapArtifacts: Boolean(project.githubPrimaryIssueNumber || project.githubPrimaryPrNumber),
  })

  const updatedProject = await prisma.project.update({
    where: { id: project.id },
    data: {
      githubLastSyncedAt: new Date(),
      githubSyncStatus: 'complete',
      githubWorkflowStatus: workflowStatus,
      deliveryStage: deriveDeliveryStageFromGithubWorkflowStatus(workflowStatus),
      agentGithubStatus: deriveAgentGithubStatusFromGithubWorkflowStatus(workflowStatus),
      handoffRequestedAt:
        workflowStatus === 'not_started' ? project.handoffRequestedAt : project.handoffRequestedAt || new Date(),
      handoffCompletedAt: workflowStatus === 'ready_for_launch' ? project.handoffCompletedAt || new Date() : null,
    },
  })

  await createGithubActivity(prisma, {
      projectId: project.id,
      eventType: 'sync_snapshot',
      title: 'GitHub sync snapshot captured',
      status: workflowStatus,
      metadata: snapshot as unknown as Record<string, unknown>,
  })

  if (workflowStatus === 'in_progress' || workflowStatus === 'review') {
    await createLifecycleEvent(prisma, {
      projectId: project.id,
      eventType: 'github_progress_detected',
        title: 'GitHub development activity detected',
        description: 'Recent GitHub activity indicates the project is actively moving forward.',
        deliveryStage: updatedProject.deliveryStage,
        agentGithubStatus: updatedProject.agentGithubStatus,
        metadata: snapshot as unknown as Record<string, unknown>,
    })
  }

  if (workflowStatus === 'ready_for_launch') {
    await createLifecycleEvent(prisma, {
      projectId: project.id,
      eventType: 'github_ready_for_launch',
        title: 'GitHub work is ready for launch',
        description: 'The GitHub development workflow reached a launch-ready state.',
        deliveryStage: updatedProject.deliveryStage,
        agentGithubStatus: updatedProject.agentGithubStatus,
        metadata: snapshot as unknown as Record<string, unknown>,
      })
  }

  return {
    project: updatedProject,
    snapshot,
  }
}
