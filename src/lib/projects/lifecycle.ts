import type { Prisma, PrismaClient } from '@prisma/client'

interface LifecycleDbClient {
  projectLifecycleEvent: PrismaClient['projectLifecycleEvent']
  projectGithubActivity: PrismaClient['projectGithubActivity']
}

export interface CreateLifecycleEventInput {
  projectId: string
  eventType: string
  title: string
  description?: string | null
  deliveryStage?: string | null
  agentGithubStatus?: string | null
  actorType?: string
  actorId?: string | null
  actorName?: string | null
  metadata?: Record<string, unknown> | null
}

export interface CreateGithubActivityInput {
  projectId: string
  githubEventId?: string | null
  eventType: string
  title: string
  url?: string | null
  number?: number | null
  status?: string | null
  authorLogin?: string | null
  metadata?: Record<string, unknown> | null
}

function stringifyMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null
  }

  return JSON.stringify(metadata)
}

export async function createLifecycleEvent(
  db: LifecycleDbClient,
  input: CreateLifecycleEventInput
) {
  return db.projectLifecycleEvent.create({
    data: {
      projectId: input.projectId,
      eventType: input.eventType,
      title: input.title,
      description: input.description ?? null,
      deliveryStage: input.deliveryStage ?? null,
      agentGithubStatus: input.agentGithubStatus ?? null,
      actorType: input.actorType ?? 'system',
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      metadata: stringifyMetadata(input.metadata),
    },
  })
}

export async function createGithubActivity(
  db: LifecycleDbClient,
  input: CreateGithubActivityInput
) {
  return db.projectGithubActivity.create({
    data: {
      projectId: input.projectId,
      githubEventId: input.githubEventId ?? null,
      eventType: input.eventType,
      title: input.title,
      url: input.url ?? null,
      number: input.number ?? null,
      status: input.status ?? null,
      authorLogin: input.authorLogin ?? null,
      metadata: stringifyMetadata(input.metadata),
    },
  })
}

export type ProjectLifecycleEventRecord = Prisma.ProjectLifecycleEventGetPayload<Record<string, never>>
export type ProjectGithubActivityRecord = Prisma.ProjectGithubActivityGetPayload<Record<string, never>>
