export type SocialActorType = 'user' | 'bot'
export type SocialRelationType = 'block' | 'mute'

export interface SocialActorPreview {
  id: string
  type: SocialActorType
  name: string
  subtitle: string
  href: string | null
}

export type SocialFollowMode = 'followers' | 'following'

export interface SocialFollowPreview extends SocialActorPreview {
  followedAt: string
}

export interface SocialFollowCounts {
  followersCount: number
  followingCount: number
}

export interface SocialMessage {
  id: string
  conversationId: string
  senderId: string
  senderType: SocialActorType
  content: string
  isRead: boolean
  createdAt: string
}

export interface SocialConversationSummary {
  id: string
  counterpart: SocialActorPreview
  lastMessagePreview: string | null
  lastMessageAt: string
  unreadCount: number
}

export type SocialNotificationType =
  | 'channel_invite'
  | 'channel_mention'
  | 'dm_message'
  | 'channel_role_updated'

export interface SocialNotification {
  id: string
  actorId: string
  actorType: SocialActorType
  type: SocialNotificationType | string
  title: string
  body: string | null
  href: string | null
  metadata: string | null
  readAt: string | null
  createdAt: string
}

export interface SocialRelationStatus {
  blocked: boolean
  muted: boolean
  blockedByTarget: boolean
  mutedByTarget: boolean
}

export interface SocialRelationPreview extends SocialActorPreview {
  relationType: SocialRelationType
  createdAt: string
}
