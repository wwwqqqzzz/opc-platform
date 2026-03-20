import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/jwt'
import { isAgentGithubStatus } from '@/lib/project-stage'

async function getOwnedProject(projectId: string, userId?: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      idea: true,
      launch: true,
    },
  })

  if (!project) {
    return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) }
  }

  if (project.userId && project.userId !== userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
  }

  return { project }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const owned = await getOwnedProject(id, user.id)
    if (owned.error) {
      return owned.error
    }

    const { project } = owned
    if (project.launch) {
      return NextResponse.json({ error: 'Project is already launched' }, { status: 400 })
    }

    const body = await request.json()
    const {
      agentGithubUrl,
      repositoryUrl,
      notes,
    }: {
      agentGithubUrl?: string
      repositoryUrl?: string
      notes?: string
    } = body

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        deliveryStage: 'agent_github',
        agentGithubStatus: 'queued',
        agentGithubUrl: agentGithubUrl || project.agentGithubUrl,
        agentGithubNotes: notes || project.agentGithubNotes,
        githubUrl: repositoryUrl || project.githubUrl,
        handoffRequestedAt: project.handoffRequestedAt || new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        idea: true,
        launch: true,
      },
    })

    return NextResponse.json({
      message: 'Project handed off to Agent GitHub',
      project: updatedProject,
    })
  } catch (error) {
    console.error('Failed to hand off project to Agent GitHub:', error)
    return NextResponse.json(
      { error: 'Failed to hand off project to Agent GitHub' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const owned = await getOwnedProject(id, user.id)
    if (owned.error) {
      return owned.error
    }

    const { project } = owned
    const body = await request.json()
    const {
      agentGithubStatus,
      agentGithubUrl,
      repositoryUrl,
      notes,
    }: {
      agentGithubStatus?: string
      agentGithubUrl?: string
      repositoryUrl?: string
      notes?: string
    } = body

    if (agentGithubStatus && !isAgentGithubStatus(agentGithubStatus)) {
      return NextResponse.json({ error: 'Invalid Agent GitHub status' }, { status: 400 })
    }

    const nextStatus = agentGithubStatus || project.agentGithubStatus
    const nextDeliveryStage =
      nextStatus === 'complete'
        ? 'launch_ready'
        : nextStatus === 'pending'
        ? 'project'
        : 'agent_github'

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        deliveryStage: nextDeliveryStage,
        agentGithubStatus: nextStatus,
        agentGithubUrl: agentGithubUrl ?? project.agentGithubUrl,
        agentGithubNotes: notes ?? project.agentGithubNotes,
        githubUrl: repositoryUrl ?? project.githubUrl,
        handoffRequestedAt:
          nextStatus === 'pending'
            ? null
            : project.handoffRequestedAt || new Date(),
        handoffCompletedAt: nextStatus === 'complete' ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        idea: true,
        launch: true,
      },
    })

    return NextResponse.json({
      message:
        nextStatus === 'complete'
          ? 'Agent GitHub work marked complete. Project is now launch ready.'
          : 'Agent GitHub status updated.',
      project: updatedProject,
    })
  } catch (error) {
    console.error('Failed to update Agent GitHub status:', error)
    return NextResponse.json(
      { error: 'Failed to update Agent GitHub status' },
      { status: 500 }
    )
  }
}
