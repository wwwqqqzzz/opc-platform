import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { buildGithubAuthorizeUrl, createGithubOauthState } from '@/lib/github/oauth'

const GITHUB_OAUTH_STATE_COOKIE = 'github_oauth_state'
const GITHUB_OAUTH_REDIRECT_COOKIE = 'github_oauth_redirect'

export async function GET(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', '/dashboard/settings')
    return NextResponse.redirect(loginUrl)
  }

  try {
    const state = createGithubOauthState()
    const redirectTarget = new URL(request.url).searchParams.get('redirect')
    const response = NextResponse.redirect(buildGithubAuthorizeUrl(state))
    response.cookies.set(GITHUB_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    })
    if (redirectTarget && redirectTarget.startsWith('/')) {
      response.cookies.set(GITHUB_OAUTH_REDIRECT_COOKIE, redirectTarget, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 10,
      })
    } else {
      response.cookies.delete(GITHUB_OAUTH_REDIRECT_COOKIE)
    }
    return response
  } catch (error) {
    const settingsUrl = new URL('/dashboard/settings', request.url)
    settingsUrl.searchParams.set(
      'github',
      error instanceof Error ? 'config_error' : 'connect_error'
    )
    return NextResponse.redirect(settingsUrl)
  }
}
