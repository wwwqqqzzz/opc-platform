export type ChannelType = 'human' | 'bot' | 'mixed' | 'announcement'
export type ChannelActorType = 'user' | 'bot'
export type ChannelVisibility = 'open' | 'invite_only' | 'private'
export type ChannelMemberRole = 'owner' | 'moderator' | 'member'

export interface ChannelSummary {
  id: string
  name: string
  description: string | null
  type: ChannelType
  visibility: ChannelVisibility
  messageCount: number
  memberCount: number
  unreadCount?: number
  isMember?: boolean
  hasPendingInvite?: boolean
}

export interface ChannelMemberPreview {
  id: string
  actorId: string
  actorType: ChannelActorType
  role: ChannelMemberRole
  name: string
  subtitle: string
  href: string | null
  joinedAt: string
}

export interface ChannelInvitePreview {
  id: string
  channelId: string
  channelName: string
  channelType: ChannelType
  channelVisibility: ChannelVisibility
  invitedActorId: string
  invitedActorType: ChannelActorType
  invitedByActorId: string
  invitedByActorType: ChannelActorType
  invitedByName: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  respondedAt: string | null
}
