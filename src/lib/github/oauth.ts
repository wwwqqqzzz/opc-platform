import { randomUUID } from 'crypto'
import { githubRequest } from '@/lib/github/client'

const GITHUB_AUTH_BASE_URL = 'https://github.com/login/oauth'
export const GITHUB_OAUTH_SCOPES = ['repo', 'read:user', 'user:email']

export function getGithubOauthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const redirectUri =
    process.env.GITHUB_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/integrations/github/callback'

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth is not configured')
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  }
}

export function createGithubOauthState() {
  return randomUUID()
}

export function buildGithubAuthorizeUrl(state: string) {
  const { clientId, redirectUri } = getGithubOauthConfig()
  const url = new URL(`${GITHUB_AUTH_BASE_URL}/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', GITHUB_OAUTH_SCOPES.join(' '))
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeGithubCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGithubOauthConfig()
  const response = await fetch(`${GITHUB_AUTH_BASE_URL}/access_token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  })

  const data = await response.json()
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to exchange GitHub OAuth code')
  }

  return data as {
    access_token: string
    token_type: string
    scope: string
  }
}

export interface GithubViewer {
  id: number
  login: string
  name: string | null
  avatar_url: string | null
}

export async function fetchGithubViewer(accessToken: string) {
  return githubRequest<GithubViewer>(accessToken, '/user')
}
