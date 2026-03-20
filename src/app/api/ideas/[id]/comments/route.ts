import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  checkRateLimit,
  isBot,
  checkDuplicateComment,
} from '@/lib/rate-limit'
import { verifyBotAuth } from '@/lib/bot-auth'

// POST /api/ideas/[id]/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for Bot authentication first
    const botAuth = await verifyBotAuth(request)

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
    const { authorType, authorName, content } = body

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
      // Non-bot user
      if (!authorName || authorName.trim() === '') {
        return NextResponse.json({ error: 'Author name is required' }, { status: 400 })
      }
      finalAuthorType = authorType || 'human'
      finalAuthorName = authorName.trim()
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
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Create the comment with IP tracking
    const comment = await prisma.comment.create({
      data: {
        ideaId: id,
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

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
