import { githubRequest } from '@/lib/github/client'

export interface CreatedGithubIssue {
  number: number
  html_url: string
  title: string
  state: string
}

export async function createGithubIssue(
  accessToken: string,
  owner: string,
  repo: string,
  input: {
    title: string
    body: string
  }
) {
  return githubRequest<CreatedGithubIssue>(accessToken, `/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}
