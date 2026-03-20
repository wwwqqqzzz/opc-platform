import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { exchangeGithubCode, fetchGithubViewer } from '@/lib/github/oauth'

const GITHUB_OAUTH_STATE_COOKIE = 'github_oauth_state'
const GITHUB_OAUTH_REDIRECT_COOKIE = 'github_oauth_redirect'

export async function GET(request: NextRequest) {
  const settingsUrl = new URL('/dashboard/settings', request.url)
  const redirectCookie = request.cookies.get(GITHUB_OAUTH_REDIRECT_COOKIE)?.value

  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      settingsUrl.searchParams.set('github', 'auth_required')
      return NextResponse.redirect(settingsUrl)
    }

    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')
    const cookieState = request.cookies.get(GITHUB_OAUTH_STATE_COOKIE)?.value

    if (!code || !state || !cookieState || state !== cookieState) {
      settingsUrl.searchParams.set('github', 'invalid_state')
      const response = NextResponse.redirect(settingsUrl)
      response.cookies.delete(GITHUB_OAUTH_STATE_COOKIE)
      return response
    }

    const token = await exchangeGithubCode(code)
    const viewer = await fetchGithubViewer(token.access_token)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        githubId: String(viewer.id),
        githubLogin: viewer.login,
        githubName: viewer.name,
        githubAvatarUrl: viewer.avatar_url,
        githubAccessToken: token.access_token,
        githubRefreshToken: null,
        githubTokenExpiresAt: null,
        githubConnectedAt: new Date(),
      },
    })

    const redirectUrl =
      redirectCookie && redirectCookie.startsWith('/')
        ? new URL(redirectCookie, request.url)
        : settingsUrl

    if (redirectUrl.pathname === '/dashboard/settings') {
      redirectUrl.searchParams.set('github', 'connected')
    } else {
      redirectUrl.searchParams.set('github_connected', '1')
    }

    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete(GITHUB_OAUTH_STATE_COOKIE)
    response.cookies.delete(GITHUB_OAUTH_REDIRECT_COOKIE)
    return response
  } catch (error) {
    console.error('GitHub OAuth callback failed:', error)
    settingsUrl.searchParams.set('github', 'callback_error')
    const response = NextResponse.redirect(settingsUrl)
    response.cookies.delete(GITHUB_OAUTH_STATE_COOKIE)
    response.cookies.delete(GITHUB_OAUTH_REDIRECT_COOKIE)
    return response
  }
}
