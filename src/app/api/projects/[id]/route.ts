import type { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { mapProjectDto } from '@/lib/github/mappers'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { isAgentGithubStatus, isProjectDeliveryStage } from '@/lib/project-stage'

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
    take: 50,
  },
  lifecycleEvents: {
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ProjectInclude

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: projectInclude,
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(mapProjectDto(project))
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()
    const body = await request.json()

    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (existingProject.userId && existingProject.userId !== user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const {
      title,
      description,
      ownerName,
      agentTeam,
      githubUrl,
      status,
      deliveryStage,
      agentGithubStatus,
      agentGithubUrl,
      agentGithubNotes,
      handoffRequestedAt,
      handoffCompletedAt,
    } = body as {
      title?: string
      description?: string
      ownerName?: string
      agentTeam?: unknown
      githubUrl?: string
      status?: string
      deliveryStage?: string
      agentGithubStatus?: string
      agentGithubUrl?: string
      agentGithubNotes?: string
      handoffRequestedAt?: string
      handoffCompletedAt?: string
    }

    if (deliveryStage && !isProjectDeliveryStage(deliveryStage)) {
      return NextResponse.json({ error: 'Invalid delivery stage' }, { status: 400 })
    }

    if (agentGithubStatus && !isAgentGithubStatus(agentGithubStatus)) {
      return NextResponse.json({ error: 'Invalid Agent GitHub status' }, { status: 400 })
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        title,
        description,
        ownerName,
        agentTeam: Array.isArray(agentTeam) ? JSON.stringify(agentTeam) : undefined,
        githubUrl,
        status,
        deliveryStage,
        agentGithubStatus,
        agentGithubUrl,
        agentGithubNotes,
        handoffRequestedAt: handoffRequestedAt ? new Date(handoffRequestedAt) : undefined,
        handoffCompletedAt: handoffCompletedAt ? new Date(handoffCompletedAt) : undefined,
      },
      include: projectInclude,
    })

    return NextResponse.json(mapProjectDto(project))
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()

    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (existingProject.userId && existingProject.userId !== user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.project.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
