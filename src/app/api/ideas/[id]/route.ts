import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/jwt'
import { isForumCategory } from '@/lib/social/forum'
import { createNotification } from '@/lib/social/notifications'

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
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(idea)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
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
    const { status, title, description, targetUser, agentTypes, tags, category, isPinned, isLocked } = body

    // Check if idea exists and user owns it
    const existingIdea = await prisma.idea.findUnique({
      where: { id },
    })

    if (!existingIdea) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Only allow the owner to update from the human surface
    if (!user || (existingIdea.userId && existingIdea.userId !== user.id) || existingIdea.authorType !== 'human') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const idea = await prisma.idea.update({
      where: { id },
      data: {
        status,
        title,
        description,
        category: isForumCategory(category) ? category : undefined,
        isPinned: typeof isPinned === 'boolean' ? isPinned : undefined,
        isLocked: typeof isLocked === 'boolean' ? isLocked : undefined,
        targetUser,
        agentTypes: agentTypes ? JSON.stringify(agentTypes) : undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
    })

    if (idea.authorType === 'agent' && existingIdea.authorName) {
      const bot = await prisma.bot.findFirst({
        where: {
          name: existingIdea.authorName,
          isActive: true,
        },
        select: { id: true },
      })

      if (bot && (existingIdea.isLocked !== idea.isLocked || existingIdea.isPinned !== idea.isPinned)) {
        await createNotification({
          actorId: bot.id,
          actorType: 'bot',
          type: 'forum_thread_updated',
          title: 'Your forum thread settings changed',
          body: `Pinned: ${idea.isPinned ? 'yes' : 'no'}, locked: ${idea.isLocked ? 'yes' : 'no'}.`,
          href: `/post/${idea.id}`,
          metadata: idea.id,
        }).catch(() => null)
      }
    }

    return NextResponse.json(idea)
  } catch {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
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
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Only allow the owner to delete from the human surface
    if (!user || (existingIdea.userId && existingIdea.userId !== user.id) || existingIdea.authorType !== 'human') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.idea.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
