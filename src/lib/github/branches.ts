import { Buffer } from 'buffer'
import { githubRequest } from '@/lib/github/client'

interface GithubGitRef {
  object: {
    sha: string
  }
}

export async function createGithubBranch(
  accessToken: string,
  owner: string,
  repo: string,
  defaultBranch: string,
  branchName: string
) {
  const ref = await githubRequest<GithubGitRef>(
    accessToken,
    `/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`
  )

  await githubRequest(accessToken, `/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    }),
  })
}

export async function commitGithubFile(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string,
  path: string,
  content: string,
  message: string
) {
  const encodedContent = Buffer.from(content).toString('base64')

  await githubRequest(accessToken, `/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: encodedContent,
      branch: branchName,
    }),
  })
}
