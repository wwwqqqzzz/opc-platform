import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isForumCategory, listForumThreads, normalizeForumSortMode } from '@/lib/social/forum'
import { requireBotSurfaceActor } from '@/lib/social/bot-surface'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireBotSurfaceActor(request)
    if (!auth.actor) {
      return NextResponse.json(
        { error: auth.response?.error || 'Unauthorized' },
        { status: auth.response?.status || 401 }
      )
    }

    const category = request.nextUrl.searchParams.get('category')
    const status = request.nextUrl.searchParams.get('status')
    const sort = request.nextUrl.searchParams.get('sort')

    const threads = await listForumThreads({
      category: isForumCategory(category) ? category : undefined,
      authorType: 'agent',
      sort: normalizeForumSortMode(sort),
      limit: 50,
    })

    const ownedThreads = threads.filter((thread) => thread.authorName === auth.actor.name)

    return NextResponse.json({
      bot: {
        id: auth.actor.id,
        name: auth.actor.name,
      },
      threads: status ? ownedThreads.filter((thread) => thread.status === status) : ownedThreads,
    })
  } catch (error) {
    console.error('Error fetching bot forum threads:', error)
    return NextResponse.json({ error: 'Failed to fetch bot forum threads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBotSurfaceActor(request)
    if (!auth.actor) {
      return NextResponse.json(
        { error: auth.response?.error || 'Unauthorized' },
        { status: auth.response?.status || 401 }
      )
    }

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const targetUser = typeof body.targetUser === 'string' ? body.targetUser.trim() : ''
    const category = typeof body.category === 'string' ? body.category : null
    const agentTypes = Array.isArray(body.agentTypes)
      ? body.agentTypes.filter((item: unknown): item is string => typeof item === 'string')
      : []
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((item: unknown): item is string => typeof item === 'string')
      : []

    if (!title || !description) {
      return NextResponse.json(
        { error: 'title and description are required' },
        { status: 400 }
      )
    }

    const bot = await prisma.bot.findUnique({
      where: { id: auth.actor.id },
      select: { ownerId: true },
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const thread = await prisma.idea.create({
      data: {
        title,
        description,
        category: isForumCategory(category) ? category : 'general',
        targetUser: targetUser || null,
        agentTypes: JSON.stringify(agentTypes),
        tags: JSON.stringify(tags),
        authorType: 'agent',
        authorName: auth.actor.name,
        userId: bot.ownerId,
      },
    })

    return NextResponse.json(
      {
        message: 'Bot forum thread created successfully',
        thread: {
          id: thread.id,
          title: thread.title,
          category: thread.category || 'general',
          status: thread.status,
          createdAt: thread.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating bot forum thread:', error)
    return NextResponse.json({ error: 'Failed to create bot forum thread' }, { status: 500 })
  }
}
