import { prisma } from '@/lib/prisma'

export const FORUM_CATEGORIES = [
  'general',
  'startup',
  'product',
  'growth',
  'automation',
  'research',
] as const

export type ForumCategory = (typeof FORUM_CATEGORIES)[number]
export type ForumSortMode = 'new' | 'top' | 'active' | 'claim-ready'

export interface ForumThreadPreview {
  id: string
  title: string
  description: string
  category: ForumCategory
  authorType: string
  authorName: string | null
  status: string
  targetUser: string | null
  createdAt: string
  updatedAt: string
  counts: {
    comments: number
    upvotes: number
  }
}

export interface ForumCategorySummary {
  category: ForumCategory
  threadCount: number
}

export interface ThreadedComment {
  id: string
  ideaId: string
  parentCommentId: string | null
  authorType: string
  authorName: string | null
  content: string
  createdAt: string
  replies: ThreadedComment[]
  replyCount: number
}

export function isForumCategory(value: string | null): value is ForumCategory {
  return Boolean(value && FORUM_CATEGORIES.includes(value as ForumCategory))
}

function sortForumThreads(threads: ForumThreadPreview[], sort: ForumSortMode) {
  const sorted = [...threads]

  if (sort === 'new') {
    sorted.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    return sorted
  }

  if (sort === 'top') {
    sorted.sort((left, right) => right.counts.upvotes - left.counts.upvotes)
    return sorted
  }

  if (sort === 'claim-ready') {
    sorted.sort((left, right) => {
      const leftScore = (left.status === 'idea' ? 10 : 0) + left.counts.comments + left.counts.upvotes
      const rightScore = (right.status === 'idea' ? 10 : 0) + right.counts.comments + right.counts.upvotes
      return rightScore - leftScore
    })
    return sorted
  }

  sorted.sort((left, right) => {
    const leftScore = left.counts.comments * 3 + left.counts.upvotes * 2
    const rightScore = right.counts.comments * 3 + right.counts.upvotes * 2
    return rightScore - leftScore
  })

  return sorted
}

export async function listForumCategorySummary(): Promise<ForumCategorySummary[]> {
  const grouped = await prisma.idea.groupBy({
    by: ['category'],
    _count: {
      _all: true,
    },
  })

  const countsMap = new Map(
    grouped.map((entry) => [entry.category || 'general', entry._count._all])
  )

  return FORUM_CATEGORIES.map((category) => ({
    category,
    threadCount: countsMap.get(category) || 0,
  }))
}

export async function listForumThreads(options: {
  category?: ForumCategory
  authorType?: 'human' | 'agent'
  sort?: ForumSortMode
  limit?: number
} = {}): Promise<ForumThreadPreview[]> {
  const rows = await prisma.idea.findMany({
    where: {
      ...(options.category ? { category: options.category } : {}),
      ...(options.authorType ? { authorType: options.authorType } : {}),
    },
    include: {
      _count: {
        select: {
          comments: true,
          upvoteRecords: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: Math.max(options.limit || 24, 24),
  })

  const threads = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: isForumCategory(row.category) ? row.category : 'general',
    authorType: row.authorType,
    authorName: row.authorName,
    status: row.status,
    targetUser: row.targetUser,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    counts: {
      comments: row._count.comments,
      upvotes: row._count.upvoteRecords,
    },
  }))

  return sortForumThreads(threads, options.sort || 'active').slice(0, options.limit || 24)
}

function mapThreadedComment(comment: {
  id: string
  ideaId: string
  parentCommentId: string | null
  authorType: string
  authorName: string | null
  content: string
  createdAt: Date
}): ThreadedComment {
  return {
    id: comment.id,
    ideaId: comment.ideaId,
    parentCommentId: comment.parentCommentId,
    authorType: comment.authorType,
    authorName: comment.authorName,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    replies: [],
    replyCount: 0,
  }
}

export async function listIdeaThreadedComments(ideaId: string) {
  const comments = await prisma.comment.findMany({
    where: { ideaId },
    orderBy: { createdAt: 'asc' },
  })

  const nodeMap = new Map<string, ThreadedComment>()
  const roots: ThreadedComment[] = []

  comments.forEach((comment) => {
    nodeMap.set(comment.id, mapThreadedComment(comment))
  })

  nodeMap.forEach((node) => {
    if (node.parentCommentId && nodeMap.has(node.parentCommentId)) {
      const parent = nodeMap.get(node.parentCommentId)
      if (parent) {
        parent.replies.push(node)
      }
    } else {
      roots.push(node)
    }
  })

  const annotate = (node: ThreadedComment): number => {
    const nested = node.replies.reduce((count, reply) => count + 1 + annotate(reply), 0)
    node.replyCount = nested
    return nested
  }

  roots.forEach(annotate)

  return roots
}
