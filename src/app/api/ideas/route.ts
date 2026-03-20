import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/jwt'
import { verifyBotAuth } from '@/lib/bot-auth'

// GET /api/ideas - 获取所有 Ideas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const tag = searchParams.get('tag')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (status) where.status = status
    if (userId) where.userId = userId

    const ideas = await prisma.idea.findMany({
      where,
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
          take: 5,
        },
        _count: {
          select: { comments: true, upvoteRecords: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Filter by tag if provided (since SQLite doesn't support array queries well)
    const filtered = tag
      ? ideas.filter(idea => {
          const tags = JSON.parse(idea.tags || '[]')
          return tags.includes(tag)
        })
      : ideas

    return NextResponse.json(filtered)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 })
  }
}

// POST /api/ideas - 创建新 Idea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, targetUser, agentTypes, tags } = body

    // Check for Bot authentication first
    const botAuth = await verifyBotAuth(request)

    // Check for user authentication
    const user = await getAuthenticatedUser()

    // Require either Bot or User authentication
    if (!botAuth && !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide a valid API key or login.' },
        { status: 401 }
      )
    }

    // Determine author info based on authentication type
    let authorType: string
    let authorName: string
    let userId: string | null

    if (botAuth) {
      // Bot authenticated
      authorType = 'agent'
      authorName = botAuth.botName
      userId = botAuth.ownerId
    } else {
      // User authenticated
      authorType = 'human'
      authorName = user!.name || 'Anonymous'
      userId = user!.id
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        targetUser,
        agentTypes: JSON.stringify(agentTypes || []),
        tags: JSON.stringify(tags || []),
        authorType,
        authorName,
        userId,
      },
    })

    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    console.error('Error creating idea:', error)
    return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 })
  }
}
