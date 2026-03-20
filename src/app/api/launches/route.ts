import { NextRequest, NextResponse } from 'next/server'
import { mapProjectDto } from '@/lib/github/mappers'
import { getAuthenticatedUser } from '@/lib/jwt'
import { createLifecycleEvent } from '@/lib/projects/lifecycle'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'all'

    const launches = await prisma.launch.findMany({
      include: {
        project: {
          include: {
            idea: true,
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
            githubActivities: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
            lifecycleEvents: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: [{ upvotes: 'desc' }, { launchedAt: 'desc' }],
    })

    const now = new Date()
    let filtered = launches

    if (period === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filtered = launches.filter((launch) => new Date(launch.launchedAt) >= today)
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = launches.filter((launch) => new Date(launch.launchedAt) >= weekAgo)
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = launches.filter((launch) => new Date(launch.launchedAt) >= monthAgo)
    }

    return NextResponse.json(
      filtered.map((launch) => ({
        ...launch,
        project: launch.project ? mapProjectDto(launch.project) : null,
      }))
    )
  } catch (error) {
    console.error('Failed to fetch launches:', error)
    return NextResponse.json({ error: 'Failed to fetch launches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, productName, tagline, demoUrl } = body as {
      projectId?: string
      productName?: string
      tagline?: string
      demoUrl?: string
    }

    if (!projectId || !productName || !tagline) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, productName, and tagline are required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        idea: true,
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

    if (project.userId && project.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (project.status !== 'in_progress') {
      return NextResponse.json({ error: 'Project must be in progress to launch' }, { status: 400 })
    }

    if (project.deliveryStage !== 'launch_ready') {
      return NextResponse.json(
        {
          error: 'Project is not launch ready yet',
          details: 'Projects must complete the Agent GitHub stage before launch.',
        },
        { status: 400 }
      )
    }

    const existingLaunch = await prisma.launch.findUnique({
      where: { projectId },
    })

    if (existingLaunch) {
      return NextResponse.json({ error: 'Project has already been launched' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const launch = await tx.launch.create({
        data: {
          projectId: project.id,
          productName,
          tagline,
          demoUrl: demoUrl || null,
          githubUrl: project.githubUrl,
          ownerName: project.ownerName,
          agentTeam: project.agentTeam,
          sourceIdeaId: project.ideaId,
        },
      })

      await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'launched',
          deliveryStage: 'launched',
          githubWorkflowStatus: 'ready_for_launch',
          handoffCompletedAt: project.handoffCompletedAt || new Date(),
        },
      })

      if (project.ideaId) {
        await tx.idea.update({
          where: { id: project.ideaId },
          data: { status: 'launched' },
        })
      }

      await createLifecycleEvent(tx as typeof prisma, {
        projectId: project.id,
        eventType: 'launch_created',
        title: 'Launch created',
        description: `The project was launched as ${productName}.`,
        deliveryStage: 'launched',
        agentGithubStatus: 'complete',
        actorType: 'user',
        actorId: user.id,
        actorName: user.name || user.email,
        metadata: {
          launchId: launch.id,
          productName,
        },
      })

      return tx.launch.findUniqueOrThrow({
        where: { id: launch.id },
        include: {
          project: {
            include: {
              idea: true,
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
              githubActivities: {
                orderBy: { createdAt: 'desc' },
                take: 50,
              },
              lifecycleEvents: {
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      })
    })

    return NextResponse.json(
      {
        ...result,
        project: result.project ? mapProjectDto(result.project) : null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating launch:', error)
    return NextResponse.json({ error: 'Failed to create launch' }, { status: 500 })
  }
}
