import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireBotSurfaceActor,
  isActorType,
  isFollowMode,
} from '@/lib/social/bot-surface'
import {
  ensureSocialActorExists,
  getFollowCounts,
  getSocialActorPreview,
  getSocialFollowList,
  isFollowingActor,
} from '@/lib/social/follows'
import { areActorsBlocked } from '@/lib/social/relations'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireBotSurfaceActor(request)
    if (!auth.actor) {
      return NextResponse.json(
        { error: auth.response?.error || 'Unauthorized' },
        { status: auth.response?.status || 401 }
      )
    }

    const mode = request.nextUrl.searchParams.get('mode')

    if (mode === 'status') {
      const targetId = request.nextUrl.searchParams.get('targetId')
      const targetType = request.nextUrl.searchParams.get('targetType')

      if (!targetId || !isActorType(targetType)) {
        return NextResponse.json(
          { error: 'targetId and targetType are required' },
          { status: 400 }
        )
      }

      const following = await isFollowingActor(auth.actor.id, 'bot', targetId, targetType)
      return NextResponse.json({ following })
    }

    if (!isFollowMode(mode)) {
      return NextResponse.json(
        { error: 'mode must be followers, following, or status' },
        { status: 400 }
      )
    }

    const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '24', 10)
    const [actor, counts, items] = await Promise.all([
      getSocialActorPreview(auth.actor.id, 'bot'),
      getFollowCounts(auth.actor.id, 'bot'),
      getSocialFollowList(auth.actor.id, 'bot', mode, Number.isNaN(limit) ? 24 : Math.min(limit, 50)),
    ])

    return NextResponse.json({
      actor,
      mode,
      counts,
      items,
    })
  } catch (error) {
    console.error('Error fetching bot follows:', error)
    return NextResponse.json({ error: 'Failed to fetch bot follows' }, { status: 500 })
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
    const targetId = typeof body.targetId === 'string' ? body.targetId : null
    const targetType = typeof body.targetType === 'string' ? body.targetType : null

    if (!targetId || !isActorType(targetType)) {
      return NextResponse.json(
        { error: 'targetId and targetType are required' },
        { status: 400 }
      )
    }

    if (auth.actor.id === targetId && targetType === 'bot') {
      return NextResponse.json({ error: 'Bots cannot follow themselves' }, { status: 400 })
    }

    const targetExists = await ensureSocialActorExists(targetId, targetType)
    if (!targetExists) {
      return NextResponse.json({ error: 'Target actor not found' }, { status: 404 })
    }

    if (await areActorsBlocked(auth.actor, { id: targetId, type: targetType })) {
      return NextResponse.json(
        { error: 'Follow is blocked between these actors' },
        { status: 403 }
      )
    }

    await prisma.follow.upsert({
      where: {
        followerId_followerType_followingId_followingType: {
          followerId: auth.actor.id,
          followerType: 'bot',
          followingId: targetId,
          followingType: targetType,
        },
      },
      update: {},
      create: {
        followerId: auth.actor.id,
        followerType: 'bot',
        followingId: targetId,
        followingType: targetType,
      },
    })

    const [botCounts, targetCounts] = await Promise.all([
      getFollowCounts(auth.actor.id, 'bot'),
      getFollowCounts(targetId, targetType),
    ])

    return NextResponse.json({
      success: true,
      following: true,
      botCounts,
      targetCounts,
    })
  } catch (error) {
    console.error('Error creating bot follow:', error)
    return NextResponse.json({ error: 'Failed to follow actor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireBotSurfaceActor(request)
    if (!auth.actor) {
      return NextResponse.json(
        { error: auth.response?.error || 'Unauthorized' },
        { status: auth.response?.status || 401 }
      )
    }

    const body = await request.json()
    const targetId = typeof body.targetId === 'string' ? body.targetId : null
    const targetType = typeof body.targetType === 'string' ? body.targetType : null

    if (!targetId || !isActorType(targetType)) {
      return NextResponse.json(
        { error: 'targetId and targetType are required' },
        { status: 400 }
      )
    }

    await prisma.follow.deleteMany({
      where: {
        followerId: auth.actor.id,
        followerType: 'bot',
        followingId: targetId,
        followingType: targetType,
      },
    })

    const [botCounts, targetCounts] = await Promise.all([
      getFollowCounts(auth.actor.id, 'bot'),
      getFollowCounts(targetId, targetType),
    ])

    return NextResponse.json({
      success: true,
      following: false,
      botCounts,
      targetCounts,
    })
  } catch (error) {
    console.error('Error removing bot follow:', error)
    return NextResponse.json({ error: 'Failed to unfollow actor' }, { status: 500 })
  }
}
