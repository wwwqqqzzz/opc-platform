import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  checkRateLimit,
  isBot,
  checkDuplicateComment,
} from '@/lib/rate-limit'
import { verifyBotAuth } from '@/lib/bot-auth'
import { verifyAuth } from '@/lib/server-auth'
import { createNotification } from '@/lib/social/notifications'

// POST /api/ideas/[id]/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for Bot authentication first
    const botAuth = await verifyBotAuth(request)
    const userAuth = botAuth ? null : await verifyAuth(request)

    // Get client information
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Skip bot detection for authenticated bots
    if (!botAuth && isBot(userAgent)) {
      return NextResponse.json({ error: 'Bot activity detected' }, { status: 403 })
    }

    // Check rate limit (skip for authenticated bots)
    if (!botAuth) {
      const rateLimitCheck = await checkRateLimit(request, 'comment')
      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          { error: rateLimitCheck.error },
          { status: 429 }
        )
      }
    }

    const { id } = await params
    const body = await request.json()
    const { content, parentCommentId } = body

    // Validate required fields
    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // Determine author info based on authentication type
    let finalAuthorType: string
    let finalAuthorName: string

    if (botAuth) {
      // Bot authenticated
      finalAuthorType = 'agent'
      finalAuthorName = botAuth.botName
    } else {
      if (!userAuth) {
        return NextResponse.json({ error: 'Login required to comment' }, { status: 401 })
      }

      finalAuthorType = 'human'
      finalAuthorName = userAuth.name || userAuth.email || 'Human member'
    }

    // Check for duplicate comments from same IP (prevent spam)
    // Skip this check for authenticated bots
    if (!botAuth) {
      const duplicateCheck = await checkDuplicateComment(id, ipAddress, content.trim())
      if (duplicateCheck.isDuplicate) {
        return NextResponse.json(
          { error: 'You have already posted this comment recently' },
          { status: 429 }
        )
      }
    }

    // Verify the idea exists
    const idea = await prisma.idea.findUnique({
      where: { id },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (idea.isLocked) {
      return NextResponse.json({ error: 'This forum thread is locked' }, { status: 403 })
    }

    if (typeof parentCommentId === 'string' && parentCommentId.trim()) {
      const parentComment = await prisma.comment.findFirst({
        where: {
          id: parentCommentId.trim(),
          ideaId: id,
        },
      })

      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }
    }

    // Create the comment with IP tracking
    const comment = await prisma.comment.create({
      data: {
        ideaId: id,
        parentCommentId:
          typeof parentCommentId === 'string' && parentCommentId.trim()
            ? parentCommentId.trim()
            : null,
        authorType: finalAuthorType,
        authorName: finalAuthorName,
        content: content.trim(),
        ipAddress: botAuth ? null : ipAddress, // Don't store IP for bots
        userAgent: botAuth ? null : userAgent, // Don't store UA for bots
      },
      include: {
        idea: {
          select: {
            _count: {
              select: { comments: true },
            },
          },
        },
      },
    })

    if (idea.userId) {
      await createNotification({
        actorId: idea.userId,
        actorType: 'user',
        type: 'forum_reply',
        title: `${finalAuthorName} replied in your forum thread`,
        body: content.trim().slice(0, 160),
        href: `/post/${id}`,
        metadata: comment.id,
      }).catch(() => null)
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
