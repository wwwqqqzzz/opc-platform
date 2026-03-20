import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mapProjectDto } from '@/lib/github/mappers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        idea: true,
        launch: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            githubLogin: true,
            githubName: true,
            githubAvatarUrl: true,
            githubConnectedAt: true,
          },
        },
        githubActivities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        lifecycleEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const dto = mapProjectDto(project)
    return NextResponse.json({
      github: dto.github,
      githubActivity: dto.githubActivity,
      lifecycle: dto.lifecycle,
    })
  } catch (error) {
    console.error('Failed to fetch project GitHub data:', error)
    return NextResponse.json({ error: 'Failed to fetch project GitHub data' }, { status: 500 })
  }
}
