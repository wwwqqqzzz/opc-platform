import type { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { mapProjectDto } from '@/lib/github/mappers'
import { createLifecycleEvent } from '@/lib/projects/lifecycle'
import { prisma } from '@/lib/prisma'

const projectInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      githubLogin: true,
      githubName: true,
      githubAvatarUrl: true,
      githubConnectedAt: true,
    },
  },
  idea: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  launch: true,
  githubActivities: {
    orderBy: { createdAt: 'desc' as const },
    take: 25,
  },
  lifecycleEvents: {
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ProjectInclude

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const deliveryStage = searchParams.get('deliveryStage')
    const githubWorkflowStatus = searchParams.get('githubWorkflowStatus')
    const githubSyncStatus = searchParams.get('githubSyncStatus')

    const where: Prisma.ProjectWhereInput = {}
    if (status) where.status = status
    if (userId) where.userId = userId
    if (deliveryStage) where.deliveryStage = deliveryStage
    if (githubWorkflowStatus) where.githubWorkflowStatus = githubWorkflowStatus
    if (githubSyncStatus) where.githubSyncStatus = githubSyncStatus

    const projects = await prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(projects.map(mapProjectDto))
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()
    const { ideaId, ownerName, agentTeam } = body as {
      ideaId?: string
      ownerName?: string
      agentTeam?: unknown
    }

    if (!ideaId || !ownerName) {
      return NextResponse.json({ error: 'ideaId and ownerName are required' }, { status: 400 })
    }

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    if (idea.status !== 'idea') {
      return NextResponse.json(
        { error: 'Idea has already been claimed or launched' },
        { status: 400 }
      )
    }

    const agentTeamArray = Array.isArray(agentTeam)
      ? agentTeam
      : typeof agentTeam === 'string'
      ? agentTeam
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : []

    const project = await prisma.$transaction(async (tx) => {
      await tx.idea.update({
        where: { id: ideaId },
        data: { status: 'in_progress' },
      })

      const createdProject = await tx.project.create({
        data: {
          ideaId,
          title: idea.title,
          description: idea.description,
          ownerName,
          agentTeam: JSON.stringify(agentTeamArray),
          userId: user?.id || null,
          status: 'in_progress',
          deliveryStage: 'project',
          agentGithubStatus: 'pending',
          githubSyncStatus: 'idle',
          githubWorkflowStatus: 'not_started',
        },
      })

      await createLifecycleEvent(tx as typeof prisma, {
        projectId: createdProject.id,
        eventType: 'project_created',
        title: 'Project created from idea',
        description: `The idea "${idea.title}" was claimed and turned into a project.`,
        deliveryStage: 'project',
        agentGithubStatus: 'pending',
        actorType: user ? 'user' : 'system',
        actorId: user?.id || null,
        actorName: user?.name || user?.email || ownerName,
        metadata: {
          sourceIdeaId: ideaId,
        },
      })

      return tx.project.findUniqueOrThrow({
        where: { id: createdProject.id },
        include: projectInclude,
      })
    })

    return NextResponse.json(mapProjectDto(project), { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
