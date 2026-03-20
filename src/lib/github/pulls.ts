import { githubRequest } from '@/lib/github/client'

export interface GithubPullRequest {
  number: number
  html_url: string
  title: string
  state: string
  merged_at: string | null
}

export async function createGithubPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  input: {
    title: string
    head: string
    base: string
    body: string
  }
) {
  return githubRequest<GithubPullRequest>(accessToken, `/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}
