const GITHUB_API_BASE_URL = process.env.GITHUB_API_BASE_URL || 'https://api.github.com'

export class GitHubApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export function getGithubApiBaseUrl() {
  return GITHUB_API_BASE_URL.replace(/\/$/, '')
}

export async function githubRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${getGithubApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'opc-platform',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  if (response.status === 204) {
    return null as T
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
        ? data.message
        : `GitHub request failed with status ${response.status}`
    throw new GitHubApiError(message, response.status, data)
  }

  return data as T
}
