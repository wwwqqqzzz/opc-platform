import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { exchangeGithubCode, fetchGithubViewer } from '@/lib/github/oauth'

const GITHUB_OAUTH_STATE_COOKIE = 'github_oauth_state'

export async function GET(request: NextRequest) {
  const settingsUrl = new URL('/dashboard/settings', request.url)

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

    settingsUrl.searchParams.set('github', 'connected')
    const response = NextResponse.redirect(settingsUrl)
    response.cookies.delete(GITHUB_OAUTH_STATE_COOKIE)
    return response
  } catch (error) {
    console.error('GitHub OAuth callback failed:', error)
    settingsUrl.searchParams.set('github', 'callback_error')
    const response = NextResponse.redirect(settingsUrl)
    response.cookies.delete(GITHUB_OAUTH_STATE_COOKIE)
    return response
  }
}
