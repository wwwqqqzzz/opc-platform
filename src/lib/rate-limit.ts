import { NextRequest } from 'next/server'
import { prisma } from './prisma'

// Rate limit configuration
const RATE_LIMITS = {
  upvote: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  comment: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  general: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
}

// Simple in-memory rate limiter for production
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map()

  check(identifier: string, limit: number, windowMs: number): { allowed: boolean; resetTime?: number } {
    const now = Date.now()
    const record = this.requests.get(identifier)

    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      })
      return { allowed: true }
    }

    if (record.count >= limit) {
      return { allowed: false, resetTime: record.resetTime }
    }

    record.count++
    return { allowed: true }
  }

  cleanup() {
    const now = Date.now()
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key)
      }
    }
  }
}

const rateLimiter = new RateLimiter()

// Clean up expired entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000)
}

export async function checkRateLimit(
  request: NextRequest,
  type: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; resetTime?: number; error?: string }> {
  const identifier = getClientIdentifier(request)
  const limit = RATE_LIMITS[type]

  const result = rateLimiter.check(identifier, limit.maxRequests, limit.windowMs)

  if (!result.allowed) {
    return {
      allowed: false,
      resetTime: result.resetTime,
      error: `Rate limit exceeded. Maximum ${limit.maxRequests} requests per ${limit.windowMs / 1000} seconds.`,
    }
  }

  return { allowed: true }
}

export function getClientIdentifier(request: NextRequest): string {
  // Get IP address from headers
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Get user agent
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return `${ip}-${userAgent}`
}

export function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /go-http/,
    /node/,
    /axios/,
    /fetch/,
  ]

  return botPatterns.some((pattern) => pattern.test(userAgent))
}

export async function checkDuplicateUpvote(
  ideaId: string,
  ipAddress: string
): Promise<{ isDuplicate: boolean; count: number }> {
  const recentUpvotes = await prisma.upvote.findMany({
    where: {
      ideaId,
      ipAddress,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
  })

  return {
    isDuplicate: recentUpvotes.length > 0,
    count: recentUpvotes.length,
  }
}

export async function checkDuplicateComment(
  ideaId: string,
  ipAddress: string,
  content: string
): Promise<{ isDuplicate: boolean; count: number }> {
  const recentComments = await prisma.comment.findMany({
    where: {
      ideaId,
      ipAddress,
      content,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // Last 1 hour
      },
    },
  })

  return {
    isDuplicate: recentComments.length > 0,
    count: recentComments.length,
  }
}
