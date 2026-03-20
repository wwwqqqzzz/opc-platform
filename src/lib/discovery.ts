import { prisma } from '@/lib/prisma'
import type { DiscoverySnapshot } from '@/types/discovery'

export async function getDiscoverySnapshot(): Promise<DiscoverySnapshot> {
  const [ideas, projects, launches, channels, totalIdeas, openIdeas, totalProjects, totalLaunches, totalChannels] = await Promise.all([
    prisma.idea.findMany({
      include: {
        _count: {
          select: { comments: true },
        },
      },
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
      take: 24,
    }),
    prisma.project.findMany({
      where: {
        status: 'in_progress',
      },
      include: {
        idea: {
          select: {
            title: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 12,
    }),
    prisma.launch.findMany({
      orderBy: [{ launchedAt: 'desc' }],
      take: 12,
    }),
    prisma.channel.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    }),
    prisma.idea.count(),
    prisma.idea.count({
      where: { status: 'idea' },
    }),
    prisma.project.count({
      where: { status: 'in_progress' },
    }),
    prisma.launch.count(),
    prisma.channel.count({
      where: { isActive: true },
    }),
  ])

  const latestIdeas = [...ideas]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8)
    .map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      authorType: idea.authorType,
      authorName: idea.authorName,
      status: idea.status,
      upvotes: idea.upvotes,
      createdAt: idea.createdAt.toISOString(),
      commentCount: idea._count.comments,
    }))

  const claimReadyIdeas = ideas
    .filter((idea) => idea.status === 'idea')
    .slice(0, 8)
    .map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      authorType: idea.authorType,
      authorName: idea.authorName,
      status: idea.status,
      upvotes: idea.upvotes,
      createdAt: idea.createdAt.toISOString(),
      commentCount: idea._count.comments,
    }))

  const activeProjects = projects.slice(0, 8).map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    ownerName: project.ownerName,
    deliveryStage: project.deliveryStage,
    githubWorkflowStatus: project.githubWorkflowStatus,
    githubRepoFullName: project.githubRepoFullName,
    createdAt: project.createdAt.toISOString(),
    sourceIdeaTitle: project.idea?.title || null,
  }))

  const recentLaunches = launches.slice(0, 6).map((launch) => ({
    id: launch.id,
    productName: launch.productName,
    tagline: launch.tagline,
    upvotes: launch.upvotes,
    launchedAt: launch.launchedAt.toISOString(),
    githubUrl: launch.githubUrl,
  }))

  const activeChannels = [...channels]
    .sort((a, b) => b._count.messages - a._count.messages)
    .slice(0, 6)
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      description: channel.description,
      messageCount: channel._count.messages,
    }))

  return {
    stats: {
      totalIdeas,
      openIdeas,
      activeProjects: totalProjects,
      launches: totalLaunches,
      channels: totalChannels,
    },
    claimReadyIdeas,
    latestIdeas,
    activeProjects,
    recentLaunches,
    activeChannels,
  }
}
