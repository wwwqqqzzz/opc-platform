import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { getGithubConfigStatus, getGithubUser, serializeGithubConnection } from '@/lib/github/auth'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const githubUser = await getGithubUser(user.id)
    const blockingProjectCount = await prisma.project.count({
      where: {
        userId: user.id,
        githubRepoFullName: {
          not: null,
        },
      },
    })
    const { configured, missingEnv } = getGithubConfigStatus()
    const blockingProjects = await prisma.project.findMany({
      where: {
        userId: user.id,
        githubRepoFullName: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        githubRepoFullName: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
    })

    return NextResponse.json({
      configured,
      missingEnv,
      connection: serializeGithubConnection(githubUser),
      connectedProjectCount: blockingProjectCount,
      blockingProjectCount,
      blockingProjects: blockingProjects.map((project) => ({
        id: project.id,
        title: project.title,
        githubRepoFullName: project.githubRepoFullName || '',
      })),
    })
  } catch (error) {
    console.error('Failed to fetch GitHub connection:', error)
    return NextResponse.json({ error: 'Failed to fetch GitHub connection' }, { status: 500 })
  }
}
