import type { Project } from '@prisma/client'

export function canConnectGithubRepo(project: Pick<Project, 'status' | 'githubRepoFullName' | 'githubPrimaryIssueNumber' | 'githubPrimaryPrNumber'>) {
  return getGithubRepoConnectionBlocker(project) === null
}

export function canBootstrapGithubWorkflow(project: Pick<Project, 'githubRepoFullName' | 'githubPrimaryIssueNumber' | 'githubPrimaryPrNumber' | 'status'>) {
  return getGithubBootstrapBlocker(project) === null
}

export function canDisconnectGithubRepo(
  project: Pick<Project, 'status' | 'githubRepoFullName' | 'githubPrimaryIssueNumber' | 'githubPrimaryPrNumber'>
) {
  return getGithubRepoDisconnectionBlocker(project) === null
}

export function getGithubRepoConnectionBlocker(
  project: Pick<Project, 'status' | 'githubRepoFullName' | 'githubPrimaryIssueNumber' | 'githubPrimaryPrNumber'>
) {
  if (project.status === 'launched') {
    return 'Launched projects keep their original repository provenance and cannot change repositories.'
  }

  if (!project.githubRepoFullName) {
    return null
  }

  if (project.githubPrimaryIssueNumber || project.githubPrimaryPrNumber) {
    return 'This project already created GitHub bootstrap artifacts. Keep the current repository for a reliable launch record.'
  }

  return 'This project already has a connected repository.'
}

export function getGithubBootstrapBlocker(
  project: Pick<Project, 'githubRepoFullName' | 'githubPrimaryIssueNumber' | 'githubPrimaryPrNumber' | 'status'>
) {
  if (project.status === 'launched') {
    return 'Launched projects are read-only and cannot start a new GitHub workflow.'
  }

  if (!project.githubRepoFullName) {
    return 'Connect a GitHub repository before starting the workflow.'
  }

  if (project.githubPrimaryIssueNumber || project.githubPrimaryPrNumber) {
    return 'GitHub bootstrap already exists for this project.'
  }

  return null
}

export function getGithubRepoDisconnectionBlocker(
  project: Pick<Project, 'status' | 'githubRepoFullName' | 'githubPrimaryIssueNumber' | 'githubPrimaryPrNumber'>
) {
  if (!project.githubRepoFullName) {
    return 'No GitHub repository is connected to this project.'
  }

  if (project.status === 'launched') {
    return 'Launched projects keep their original repository provenance and cannot disconnect GitHub.'
  }

  if (project.githubPrimaryIssueNumber || project.githubPrimaryPrNumber) {
    return 'This project already created GitHub bootstrap artifacts. Keep the repository attached so launch provenance stays intact.'
  }

  return null
}

export function getGithubSyncBlocker(
  project: Pick<Project, 'status' | 'githubRepoFullName'>
) {
  if (project.status === 'launched') {
    return 'This project has already launched. GitHub sync is no longer available from OPC.'
  }

  if (!project.githubRepoFullName) {
    return 'Connect a GitHub repository before running sync.'
  }

  return null
}
