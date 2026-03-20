export type ChannelType = 'human' | 'bot' | 'mixed' | 'announcement'
export type ChannelActorType = 'user' | 'bot'

export interface ChannelSummary {
  id: string
  name: string
  description: string | null
  type: ChannelType
  messageCount: number
  memberCount: number
}

export interface ChannelMemberPreview {
  id: string
  actorId: string
  actorType: ChannelActorType
  name: string
  subtitle: string
  href: string | null
  joinedAt: string
}
