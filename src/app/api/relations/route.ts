import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import { ensureSocialActorExists } from '@/lib/social/follows'
import {
  createActorRelation,
  getRelationStatus,
  listActorRelations,
  removeActorRelation,
} from '@/lib/social/relations'
import type { SocialActorType, SocialRelationType } from '@/types/social'

function isActorType(value: string | null): value is SocialActorType {
  return value === 'user' || value === 'bot'
}

function isRelationType(value: string | null): value is SocialRelationType {
  return value === 'block' || value === 'mute'
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
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

      const status = await getRelationStatus(
        { id: user.id, type: user.type },
        { id: targetId, type: targetType }
      )

      return NextResponse.json({ status })
    }

    const relationType = request.nextUrl.searchParams.get('relationType')
    if (!isRelationType(relationType)) {
      return NextResponse.json(
        { error: 'relationType must be block or mute' },
        { status: 400 }
      )
    }

    const items = await listActorRelations({ id: user.id, type: user.type }, relationType)
    return NextResponse.json({ relationType, items })
  } catch (error) {
    console.error('Error fetching actor relations:', error)
    return NextResponse.json({ error: 'Failed to fetch actor relations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const targetId = typeof body.targetId === 'string' ? body.targetId : null
    const targetType = typeof body.targetType === 'string' ? body.targetType : null
    const relationType = typeof body.relationType === 'string' ? body.relationType : null

    if (!targetId || !isActorType(targetType) || !isRelationType(relationType)) {
      return NextResponse.json(
        { error: 'targetId, targetType, and relationType are required' },
        { status: 400 }
      )
    }

    const targetExists = await ensureSocialActorExists(targetId, targetType)
    if (!targetExists) {
      return NextResponse.json({ error: 'Target actor not found' }, { status: 404 })
    }

    await createActorRelation(
      { id: user.id, type: user.type },
      { id: targetId, type: targetType },
      relationType
    )

    const status = await getRelationStatus(
      { id: user.id, type: user.type },
      { id: targetId, type: targetType }
    )

    return NextResponse.json({ success: true, status }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update relation'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const targetId = typeof body.targetId === 'string' ? body.targetId : null
    const targetType = typeof body.targetType === 'string' ? body.targetType : null
    const relationType = typeof body.relationType === 'string' ? body.relationType : null

    if (!targetId || !isActorType(targetType) || !isRelationType(relationType)) {
      return NextResponse.json(
        { error: 'targetId, targetType, and relationType are required' },
        { status: 400 }
      )
    }

    await removeActorRelation(
      { id: user.id, type: user.type },
      { id: targetId, type: targetType },
      relationType
    )

    const status = await getRelationStatus(
      { id: user.id, type: user.type },
      { id: targetId, type: targetType }
    )

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Error deleting relation:', error)
    return NextResponse.json({ error: 'Failed to delete relation' }, { status: 500 })
  }
}
