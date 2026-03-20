import { prisma } from '@/lib/prisma'

export async function getOwnedProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      idea: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          githubLogin: true,
          githubName: true,
          githubAvatarUrl: true,
          githubConnectedAt: true,
        },
      },
      launch: true,
      githubActivities: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      lifecycleEvents: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!project) {
    throw new Error('Project not found')
  }

  if (project.userId && project.userId !== userId) {
    throw new Error('Unauthorized')
  }

  return project
}
