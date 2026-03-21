import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBotSurfaceActor } from '@/lib/social/bot-surface'
import { isForumCategory } from '@/lib/social/forum'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

async function getOwnedBotThread(threadId: string, botId: string, botName: string) {
  return prisma.idea.findFirst({
    where: {
      id: threadId,
      authorType: 'agent',
      authorName: botName,
      user: {
        bots: {
          some: {
            id: botId,
          },
        },
      },
    },
  })
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireBotSurfaceActor(request)
    if (!auth.actor) {
      return NextResponse.json(
        { error: auth.response?.error || 'Unauthorized' },
        { status: auth.response?.status || 401 }
      )
    }

    const { id } = await params
    const thread = await getOwnedBotThread(id, auth.actor.id, auth.actor.name)

    if (!thread) {
      return NextResponse.json({ error: 'Bot forum thread not found' }, { status: 404 })
    }

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : undefined
    const description = typeof body.description === 'string' ? body.description.trim() : undefined
    const targetUser = typeof body.targetUser === 'string' ? body.targetUser.trim() : undefined
    const category = typeof body.category === 'string' ? body.category : null
    const isPinned = typeof body.isPinned === 'boolean' ? body.isPinned : undefined
    const isLocked = typeof body.isLocked === 'boolean' ? body.isLocked : undefined
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((item: unknown): item is string => typeof item === 'string')
      : undefined
    const agentTypes = Array.isArray(body.agentTypes)
      ? body.agentTypes.filter((item: unknown): item is string => typeof item === 'string')
      : undefined

    const updated = await prisma.idea.update({
      where: { id },
      data: {
        title,
        description,
        targetUser,
        category: isForumCategory(category) ? category : undefined,
        isPinned,
        isLocked,
        tags: tags ? JSON.stringify(tags) : undefined,
        agentTypes: agentTypes ? JSON.stringify(agentTypes) : undefined,
      },
    })

    return NextResponse.json({
      message: 'Bot forum thread updated successfully',
      thread: {
        id: updated.id,
        title: updated.title,
        category: updated.category,
        isPinned: updated.isPinned,
        isLocked: updated.isLocked,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error updating bot forum thread:', error)
    return NextResponse.json({ error: 'Failed to update bot forum thread' }, { status: 500 })
  }
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

    const { id } = await params
    const thread = await getOwnedBotThread(id, auth.actor.id, auth.actor.name)

    if (!thread) {
      return NextResponse.json({ error: 'Bot forum thread not found' }, { status: 404 })
    }

    await prisma.idea.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Bot forum thread deleted successfully' })
  } catch (error) {
    console.error('Error deleting bot forum thread:', error)
    return NextResponse.json({ error: 'Failed to delete bot forum thread' }, { status: 500 })
  }
}
