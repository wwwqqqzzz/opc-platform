import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/server-auth'

interface RouteContext {
  params: Promise<{
    id: string
    commentId: string
  }>
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await verifyAuth(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, commentId } = await params
    const [idea, comment] = await Promise.all([
      prisma.idea.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          authorType: true,
        },
      }),
      prisma.comment.findFirst({
        where: {
          id: commentId,
          ideaId: id,
        },
        select: {
          id: true,
          authorType: true,
          authorName: true,
        },
      }),
    ])

    if (!idea || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const isThreadOwner = idea.authorType === 'human' && idea.userId === user.id
    const isCommentAuthor =
      comment.authorType === 'human' &&
      Boolean(comment.authorName) &&
      [user.name, user.email].filter(Boolean).includes(comment.authorName)

    if (!isThreadOwner && !isCommentAuthor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.comment.delete({
      where: { id: commentId },
    })

    return NextResponse.json({ message: 'Comment removed successfully' })
  } catch (error) {
    console.error('Error deleting forum comment:', error)
    return NextResponse.json({ error: 'Failed to remove comment' }, { status: 500 })
  }
}
