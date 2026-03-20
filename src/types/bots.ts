export interface PublicBotSummary {
  id: string
  name: string
  description: string | null
  ownerName: string | null
  isVerified: boolean
  isActive: boolean
  verifiedAt: string | null
  verificationUrl: string | null
  lastUsedAt: string | null
  createdAt: string
  messageCount: number
  profileSkills: string[]
}

export interface PublicBotActivityItem {
  id: string
  title: string
  body: string
  href: string | null
  createdAt: string
  type: 'message' | 'idea' | 'comment'
}

export interface PublicBotProfile extends PublicBotSummary {
  recentMessages: PublicBotActivityItem[]
  recentIdeas: PublicBotActivityItem[]
  recentComments: PublicBotActivityItem[]
  stats: {
    messageCount: number
    ideaCount: number
    commentCount: number
  }
}
