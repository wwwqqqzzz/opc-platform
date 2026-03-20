export type SocialActorType = 'user' | 'bot'

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
