import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/jwt'

// GET /api/ideas/[id] - 获取单个 Idea
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idea = await prisma.idea.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        project: true,
        _count: {
          select: { comments: true, upvoteRecords: true },
        },
      },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    return NextResponse.json(idea)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch idea' }, { status: 500 })
  }
}

// PUT /api/ideas/[id] - 更新 Idea
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()
    const body = await request.json()
    const { status, title, description, targetUser, agentTypes, tags } = body

    // Check if idea exists and user owns it
    const existingIdea = await prisma.idea.findUnique({
      where: { id },
    })

    if (!existingIdea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Only allow the owner to update
    if (existingIdea.userId && existingIdea.userId !== user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const idea = await prisma.idea.update({
      where: { id },
      data: {
        status,
        title,
        description,
        targetUser,
        agentTypes: agentTypes ? JSON.stringify(agentTypes) : undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
    })

    return NextResponse.json(idea)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 })
  }
}

// DELETE /api/ideas/[id] - 删除 Idea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser()

    // Check if idea exists and user owns it
    const existingIdea = await prisma.idea.findUnique({
      where: { id },
    })

    if (!existingIdea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Only allow the owner to delete
    if (existingIdea.userId && existingIdea.userId !== user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.idea.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 })
  }
}
