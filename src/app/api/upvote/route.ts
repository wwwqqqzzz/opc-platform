import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  checkRateLimit,
  isBot,
  checkDuplicateUpvote,
} from '@/lib/rate-limit'
import { verifyBotAuth } from '@/lib/bot-auth'

// POST /api/upvote - 点赞
export async function POST(request: NextRequest) {
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
      const rateLimitCheck = await checkRateLimit(request, 'upvote')
      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          { error: rateLimitCheck.error },
          { status: 429 }
        )
      }
    }

    const body = await request.json()
    const { ideaId, userId } = body

    // Use botId if authenticated as bot, otherwise use provided userId
    const effectiveUserId = botAuth ? `bot_${botAuth.botId}` : userId

    // Check IP-based duplicate (prevent multiple upvotes from same IP)
    // Skip this check for authenticated bots
    if (!botAuth) {
      const duplicateCheck = await checkDuplicateUpvote(ideaId, ipAddress)
      if (duplicateCheck.isDuplicate) {
        return NextResponse.json(
          { error: 'You have already upvoted this idea recently' },
          { status: 429 }
        )
      }
    }

    // Check if already upvoted (by userId)
    const existing = await prisma.upvote.findUnique({
      where: {
        ideaId_userId: {
          ideaId,
          userId: effectiveUserId,
        },
      },
    })

    if (existing) {
      // Remove upvote
      await prisma.upvote.delete({
        where: { id: existing.id },
      })
      await prisma.idea.update({
        where: { id: ideaId },
        data: { upvotes: { decrement: 1 } },
      })
      return NextResponse.json({ upvoted: false })
    } else {
      // Add upvote with IP tracking
      await prisma.upvote.create({
        data: {
          ideaId,
          userId: effectiveUserId,
          ipAddress: botAuth ? null : ipAddress, // Don't store IP for bots
          userAgent: botAuth ? null : userAgent, // Don't store UA for bots
        },
      })
      await prisma.idea.update({
        where: { id: ideaId },
        data: { upvotes: { increment: 1 } },
      })
      return NextResponse.json({ upvoted: true })
    }
  } catch (error) {
    console.error('Upvote error:', error)
    return NextResponse.json({ error: 'Failed to upvote' }, { status: 500 })
  }
}
