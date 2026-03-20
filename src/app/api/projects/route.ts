import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/jwt'
import type { Prisma } from '@prisma/client'

// GET /api/projects - 获取所有 Projects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    const where: Prisma.ProjectWhereInput = {}
    if (status) where.status = status
    if (userId) where.userId = userId

    const projects = await prisma.project.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(projects)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST /api/projects - 创建新 Project (认领 Idea)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()
    const { ideaId, ownerName, agentTeam } = body

    // Validate required fields
    if (!ideaId || !ownerName) {
      return NextResponse.json(
        { error: 'ideaId and ownerName are required' },
        { status: 400 }
      )
    }

    // Check if idea exists and is in 'idea' status
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
    })

    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      )
    }

    if (idea.status !== 'idea') {
      return NextResponse.json(
        { error: 'Idea has already been claimed or launched' },
        { status: 400 }
      )
    }

    // Parse agent team array
    const agentTeamArray = Array.isArray(agentTeam)
      ? agentTeam
      : typeof agentTeam === 'string'
      ? agentTeam.split(',').map(s => s.trim()).filter(Boolean)
      : []

    // Update idea status to in_progress
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: 'in_progress' },
    })

    // Create project from idea
    const project = await prisma.project.create({
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
      },
      include: {
        idea: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
