import type { Project } from '@prisma/client'

export function canConnectGithubRepo(project: Pick<Project, 'status' | 'githubRepoFullName' | 'githubPrimaryIssueNumber' | 'githubPrimaryPrNumber'>) {
  if (project.status === 'launched') {
    return false
  }

  if (!project.githubRepoFullName) {
    return true
  }

  return !project.githubPrimaryIssueNumber && !project.githubPrimaryPrNumber
}

export function canBootstrapGithubWorkflow(project: Pick<Project, 'githubRepoFullName' | 'githubPrimaryIssueNumber' | 'githubPrimaryPrNumber' | 'status'>) {
  return Boolean(
    project.status !== 'launched' &&
      project.githubRepoFullName &&
      !project.githubPrimaryIssueNumber &&
      !project.githubPrimaryPrNumber
  )
}
