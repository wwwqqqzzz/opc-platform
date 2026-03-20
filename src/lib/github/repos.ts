import { githubRequest } from '@/lib/github/client'

export interface GithubRepository {
  id: number
  name: string
  full_name: string
  html_url: string
  default_branch: string
  owner: {
    login: string
  }
}

export interface GithubCommit {
  sha: string
  html_url: string
  commit: {
    message: string
  }
  author: {
    login: string
  } | null
}

export interface GithubIssue {
  number: number
  title: string
  html_url: string
  state: string
  user: {
    login: string
  }
  pull_request?: unknown
}

export interface GithubWorkflowRun {
  id: number
  html_url: string
  status: string
  conclusion: string | null
  name: string
}

export interface GithubRelease {
  id: number
  html_url: string
  tag_name: string
  published_at: string
}

interface GithubWebhookResponse {
  id: number
  config: {
    url?: string
  }
}

export async function getGithubRepository(accessToken: string, owner: string, repo: string) {
  return githubRequest<GithubRepository>(accessToken, `/repos/${owner}/${repo}`)
}

export async function listGithubCommits(accessToken: string, owner: string, repo: string) {
  return githubRequest<GithubCommit[]>(accessToken, `/repos/${owner}/${repo}/commits?per_page=10`)
}

export async function listGithubIssues(accessToken: string, owner: string, repo: string) {
  return githubRequest<GithubIssue[]>(
    accessToken,
    `/repos/${owner}/${repo}/issues?state=open&per_page=20`
  )
}

export async function listGithubPullRequests(accessToken: string, owner: string, repo: string) {
  return githubRequest<GithubIssue[]>(
    accessToken,
    `/repos/${owner}/${repo}/pulls?state=open&per_page=20`
  )
}

export async function listGithubWorkflowRuns(accessToken: string, owner: string, repo: string) {
  const data = await githubRequest<{ workflow_runs: GithubWorkflowRun[] }>(
    accessToken,
    `/repos/${owner}/${repo}/actions/runs?per_page=10`
  )
  return data.workflow_runs
}

export async function listGithubReleases(accessToken: string, owner: string, repo: string) {
  return githubRequest<GithubRelease[]>(accessToken, `/repos/${owner}/${repo}/releases?per_page=5`)
}

export async function createGithubRepositoryWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  webhookUrl: string,
  secret: string
) {
  return githubRequest<GithubWebhookResponse>(accessToken, `/repos/${owner}/${repo}/hooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: ['push', 'issues', 'pull_request', 'pull_request_review', 'workflow_run', 'release'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    }),
  })
}
