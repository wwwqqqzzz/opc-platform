import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/authMiddleware'
import {
  ensureSocialActorExists,
  getFollowCounts,
  getSocialActorPreview,
  getSocialFollowList,
  isFollowingActor,
} from '@/lib/social/follows'
import { areActorsBlocked } from '@/lib/social/relations'
import type { SocialActorType, SocialFollowMode } from '@/types/social'

function isActorType(value: string | null): value is SocialActorType {
  return value === 'user' || value === 'bot'
}

function isFollowMode(value: string | null): value is SocialFollowMode {
  return value === 'followers' || value === 'following'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('mode')

    if (mode === 'status') {
      const { user, error } = await authenticateRequest(request)

      if (!user) {
        return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
      }

      const followingId = searchParams.get('followingId')
      const followingType = searchParams.get('followingType')

      if (!followingId || !isActorType(followingType)) {
        return NextResponse.json(
          { error: 'followingId and followingType are required' },
          { status: 400 }
        )
      }

      const following = await isFollowingActor(user.id, user.type, followingId, followingType)

      return NextResponse.json({
        following,
      })
    }

    if (!isFollowMode(mode)) {
      return NextResponse.json(
        { error: 'mode must be followers, following, or status' },
        { status: 400 }
      )
    }

    const actorId = searchParams.get('actorId')
    const actorType = searchParams.get('actorType')
    const limit = Number.parseInt(searchParams.get('limit') || '24', 10)

    if (!actorId || !isActorType(actorType)) {
      return NextResponse.json(
        { error: 'actorId and actorType are required' },
        { status: 400 }
      )
    }

    const actorExists = await ensureSocialActorExists(actorId, actorType)

    if (!actorExists) {
      return NextResponse.json({ error: 'Actor not found' }, { status: 404 })
    }

    const [actor, counts, items] = await Promise.all([
      getSocialActorPreview(actorId, actorType),
      getFollowCounts(actorId, actorType),
      getSocialFollowList(actorId, actorType, mode, Number.isNaN(limit) ? 24 : Math.min(limit, 50)),
    ])

    return NextResponse.json({
      actor,
      mode,
      counts,
      items,
    })
  } catch (error) {
    console.error('Error fetching follows:', error)
    return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const followingId = typeof body.followingId === 'string' ? body.followingId : null
    const followingType = typeof body.followingType === 'string' ? body.followingType : null

    if (!followingId || !isActorType(followingType)) {
      return NextResponse.json(
        { error: 'followingId and followingType are required' },
        { status: 400 }
      )
    }

    if (user.id === followingId && user.type === followingType) {
      return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 })
    }

    const targetExists = await ensureSocialActorExists(followingId, followingType)

    if (!targetExists) {
      return NextResponse.json({ error: 'Target actor not found' }, { status: 404 })
    }

    if (await areActorsBlocked({ id: user.id, type: user.type }, { id: followingId, type: followingType })) {
      return NextResponse.json(
        { error: 'Follow is blocked between these actors' },
        { status: 403 }
      )
    }

    await prisma.follow.upsert({
      where: {
        followerId_followerType_followingId_followingType: {
          followerId: user.id,
          followerType: user.type,
          followingId,
          followingType,
        },
      },
      update: {
        followerType: user.type,
        followingType,
      },
      create: {
        followerId: user.id,
        followerType: user.type,
        followingId,
        followingType,
      },
    })

    const counts = await getFollowCounts(followingId, followingType)

    return NextResponse.json({
      success: true,
      counts,
    })
  } catch (error) {
    console.error('Error creating follow:', error)
    return NextResponse.json({ error: 'Failed to follow actor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const followingId = typeof body.followingId === 'string' ? body.followingId : null
    const followingType = typeof body.followingType === 'string' ? body.followingType : null

    if (!followingId || !isActorType(followingType)) {
      return NextResponse.json(
        { error: 'followingId and followingType are required' },
        { status: 400 }
      )
    }

    await prisma.follow.deleteMany({
      where: {
        followerId: user.id,
        followerType: user.type,
        followingId,
        followingType,
      },
    })

    const counts = await getFollowCounts(followingId, followingType)

    return NextResponse.json({
      success: true,
      counts,
    })
  } catch (error) {
    console.error('Error removing follow:', error)
    return NextResponse.json({ error: 'Failed to unfollow actor' }, { status: 500 })
  }
}
