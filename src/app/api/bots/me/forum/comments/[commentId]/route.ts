import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBotSurfaceActor } from '@/lib/social/bot-surface'

interface RouteContext {
  params: Promise<{
    commentId: string
  }>
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireBotSurfaceActor(request)
    if (!auth.actor) {
      return NextResponse.json(
        { error: auth.response?.error || 'Unauthorized' },
        { status: auth.response?.status || 401 }
      )
    }

    const { commentId } = await params
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        idea: {
          select: {
            id: true,
            authorType: true,
            authorName: true,
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const isCommentAuthor = comment.authorType === 'agent' && comment.authorName === auth.actor.name
    const isThreadOwner =
      comment.idea.authorType === 'agent' && comment.idea.authorName === auth.actor.name

    if (!isCommentAuthor && !isThreadOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.comment.delete({
      where: { id: commentId },
    })

    return NextResponse.json({ message: 'Bot forum comment removed successfully' })
  } catch (error) {
    console.error('Error deleting bot forum comment:', error)
    return NextResponse.json({ error: 'Failed to remove bot forum comment' }, { status: 500 })
  }
}
