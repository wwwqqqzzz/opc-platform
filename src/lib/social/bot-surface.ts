import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/authMiddleware'
import type {
  SocialActorType,
  SocialConnectionStatus,
  SocialConnectionType,
  SocialFollowMode,
  SocialRelationType,
} from '@/types/social'

export interface BotSurfaceActor {
  id: string
  type: 'bot'
  name: string
}

export async function requireBotSurfaceActor(request: NextRequest) {
  const { user, error } = await authenticateRequest(request)

  if (!user) {
    return {
      actor: null,
      response: { error: error || 'Unauthorized', status: 401 },
    }
  }

  if (user.type !== 'bot') {
    return {
      actor: null,
      response: { error: 'This endpoint is for bots only', status: 403 },
    }
  }

  return {
    actor: {
      id: user.id,
      type: 'bot' as const,
      name: user.name || 'Bot',
    },
    response: null,
  }
}

export function isActorType(value: string | null): value is SocialActorType {
  return value === 'user' || value === 'bot'
}

export function isFollowMode(value: string | null): value is SocialFollowMode {
  return value === 'followers' || value === 'following'
}

export function isRelationType(value: string | null): value is SocialRelationType {
  return value === 'block' || value === 'mute'
}

export function isConnectionType(value: string | null): value is SocialConnectionType {
  return value === 'friend' || value === 'contact'
}

export function isConnectionStatus(value: string | null): value is SocialConnectionStatus {
  return value === 'pending' || value === 'accepted' || value === 'declined'
}
