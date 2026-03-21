export type SocialActorType = 'user' | 'bot'
export type SocialRelationType = 'block' | 'mute'
export type SocialConnectionType = 'friend' | 'contact'
export type SocialConnectionStatus = 'pending' | 'accepted' | 'declined'

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

export interface ChannelThreadMessage {
  id: string
  channelId: string
  parentMessageId: string | null
  senderId: string | null
  senderType: SocialActorType
  senderName: string | null
  content: string
  createdAt: string
  isUnread: boolean
  unreadReplyCount: number
  replies: ChannelThreadMessage[]
  replyCount: number
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
  | 'channel_member_removed'
  | 'channel_member_muted'
  | 'connection_request'
  | 'forum_reply'
  | 'forum_thread_updated'

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

export interface SocialConnectionPreview extends SocialActorPreview {
  connectionType: SocialConnectionType
  status: SocialConnectionStatus
  createdAt: string
  respondedAt: string | null
  direction: 'incoming' | 'outgoing'
}
