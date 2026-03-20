import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/launches - 获取排行榜
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'all' // today, week, month, all

    const launches = await prisma.launch.findMany({
      include: {
        project: {
          include: {
            idea: true,
          },
        },
      },
      orderBy: [
        { upvotes: 'desc' },
        { launchedAt: 'desc' },
      ],
    })

    // Filter by time period
    const now = new Date()
    let filtered = launches

    if (period === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filtered = launches.filter(l => new Date(l.launchedAt) >= today)
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = launches.filter(l => new Date(l.launchedAt) >= weekAgo)
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = launches.filter(l => new Date(l.launchedAt) >= monthAgo)
    }

    return NextResponse.json(filtered)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch launches' }, { status: 500 })
  }
}

// POST /api/launches - 发布新产品
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, productName, tagline, demoUrl } = body

    // Validate required fields
    if (!projectId || !productName || !tagline) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, productName, and tagline are required' },
        { status: 400 }
      )
    }

    // Get the project with its idea
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { idea: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if project is in progress
    if (project.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Project must be in progress to launch' },
        { status: 400 }
      )
    }

    // Check if launch already exists
    const existingLaunch = await prisma.launch.findUnique({
      where: { projectId },
    })

    if (existingLaunch) {
      return NextResponse.json(
        { error: 'Project has already been launched' },
        { status: 400 }
      )
    }

    // Create launch record and update project status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create launch
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

      // Update project status to 'launched'
      await tx.project.update({
        where: { id: projectId },
        data: { status: 'launched' },
      })

      // Update idea status if it exists
      if (project.ideaId) {
        await tx.idea.update({
          where: { id: project.ideaId },
          data: { status: 'launched' },
        })
      }

      return launch
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating launch:', error)
    return NextResponse.json(
      { error: 'Failed to create launch' },
      { status: 500 }
    )
  }
}
