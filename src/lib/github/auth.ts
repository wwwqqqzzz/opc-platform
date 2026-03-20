import { prisma } from '@/lib/prisma'
import type { GithubConnection } from '@/types/github'

export const GITHUB_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  githubId: true,
  githubLogin: true,
  githubName: true,
  githubAvatarUrl: true,
  githubAccessToken: true,
  githubRefreshToken: true,
  githubTokenExpiresAt: true,
  githubConnectedAt: true,
  createdAt: true,
} as const

export type GithubUserRecord = {
  id: string
  email: string
  name: string | null
  githubId: string | null
  githubLogin: string | null
  githubName: string | null
  githubAvatarUrl: string | null
  githubAccessToken: string | null
  githubRefreshToken: string | null
  githubTokenExpiresAt: Date | null
  githubConnectedAt: Date | null
  createdAt: Date
} | null

export async function getGithubUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: GITHUB_USER_SELECT,
  })
}

export async function requireGithubAccessToken(userId: string) {
  const user = await getGithubUser(userId)
  if (!user?.githubAccessToken) {
    throw new Error('GitHub account is not connected')
  }

  return {
    accessToken: user.githubAccessToken,
    user,
  }
}

export function serializeGithubConnection(
  user:
    | {
        githubLogin: string | null
        githubName: string | null
        githubAvatarUrl: string | null
        githubConnectedAt: Date | null
      }
    | null
): GithubConnection {
  if (!user?.githubConnectedAt || !user.githubLogin) {
    return {
      connected: false,
      login: null,
      name: null,
      avatarUrl: null,
      connectedAt: null,
      scopes: [],
    }
  }

  return {
    connected: true,
    login: user.githubLogin,
    name: user.githubName || null,
    avatarUrl: user.githubAvatarUrl || null,
    connectedAt: user.githubConnectedAt.toISOString(),
    scopes: ['repo', 'read:user', 'user:email'],
  }
}
