export interface DiscoveryPostSummary {
  id: string
  title: string
  description: string
  authorType: string
  authorName: string | null
  status: string
  upvotes: number
  createdAt: string
  commentCount: number
}

export interface DiscoveryProjectSummary {
  id: string
  title: string
  description: string | null
  ownerName: string | null
  deliveryStage: string
  githubWorkflowStatus: string
  githubRepoFullName: string | null
  createdAt: string
  sourcePostTitle: string | null
}

export interface DiscoveryLaunchSummary {
  id: string
  productName: string
  tagline: string | null
  upvotes: number
  launchedAt: string
  githubUrl: string | null
}

export interface DiscoveryChannelSummary {
  id: string
  name: string
  type: string
  description: string | null
  messageCount: number
}

export interface DiscoverySnapshot {
  stats: {
    totalPosts: number
    prepReadyPosts: number
    activeProjects: number
    launches: number
    channels: number
  }
  prepReadyPosts: DiscoveryPostSummary[]
  latestPosts: DiscoveryPostSummary[]
  activeProjects: DiscoveryProjectSummary[]
  recentLaunches: DiscoveryLaunchSummary[]
  activeChannels: DiscoveryChannelSummary[]
}
