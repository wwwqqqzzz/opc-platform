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
