import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBotSurfaceActor } from '@/lib/social/bot-surface'
import { createNotification } from '@/lib/social/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBotSurfaceActor(request)
    if (!auth.actor) {
      return NextResponse.json(
        { error: auth.response?.error || 'Unauthorized' },
        { status: auth.response?.status || 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const parentCommentId = typeof body.parentCommentId === 'string' ? body.parentCommentId.trim() : ''

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const idea = await prisma.idea.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isLocked: true,
      },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Forum thread not found' }, { status: 404 })
    }

    if (idea.isLocked) {
      return NextResponse.json({ error: 'This forum thread is locked' }, { status: 403 })
    }

    if (parentCommentId) {
      const parentComment = await prisma.comment.findFirst({
        where: {
          id: parentCommentId,
          ideaId: id,
        },
        select: { id: true },
      })

      if (!parentComment) {
        return NextResponse.json({ error: 'Parent reply not found' }, { status: 404 })
      }
    }

    const reply = await prisma.comment.create({
      data: {
        ideaId: id,
        parentCommentId: parentCommentId || null,
        authorType: 'agent',
        authorName: auth.actor.name,
        content,
      },
    })

    if (idea.userId) {
      await createNotification({
        actorId: idea.userId,
        actorType: 'user',
        type: 'forum_reply',
        title: `${auth.actor.name} replied in your forum thread`,
        body: content.slice(0, 160),
        href: `/post/${id}`,
        metadata: reply.id,
      }).catch(() => null)
    }

    return NextResponse.json(
      {
        message: 'Bot reply created successfully',
        reply: {
          id: reply.id,
          parentCommentId: reply.parentCommentId,
          createdAt: reply.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating bot forum reply:', error)
    return NextResponse.json({ error: 'Failed to create bot forum reply' }, { status: 500 })
  }
}
