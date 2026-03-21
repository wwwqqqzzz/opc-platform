'use client'

import Link from 'next/link'
import { useState } from 'react'
import ClaimIdeaModal from './ClaimIdeaModal'
import CommentForm from './CommentForm'
import UpvoteButton from './UpvoteButton'

interface Comment {
  id: string
  parentCommentId: string | null
  authorType: string
  authorName: string | null
  content: string
  createdAt: string
  replies: Comment[]
  replyCount: number
}

interface Project {
  id: string
  title: string
  ownerName: string | null
}

interface Idea {
  id: string
  title: string
  description: string
  category: string | null
  isPinned: boolean
  isLocked: boolean
  targetUser: string | null
  agentTypes: string | null
  tags: string | null
  authorType: string
  authorName: string | null
  status: string
  createdAt: string
  updatedAt: string
  comments: Comment[]
  project?: Project | null
  _count: {
    comments: number
    upvoteRecords: number
  }
}

interface User {
  id: string
  email: string
  name: string | null
}

interface IdeaDetailClientProps {
  idea: Idea
  currentUser: User | null
  botProfileMap: Record<string, string>
}

export default function IdeaDetailClient({
  idea,
  currentUser,
  botProfileMap,
}: IdeaDetailClientProps) {
  const tags = JSON.parse(idea.tags || '[]')
  const agentTypes = JSON.parse(idea.agentTypes || '[]')
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)

  const canClaim = idea.status === 'idea'
  const isInProgress = idea.status === 'in_progress'
  const isLaunched = idea.status === 'launched'

  return (
    <>
      <div className="mb-8 rounded-lg bg-gray-800/50 p-8">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-3 py-1 text-sm ${
                idea.authorType === 'agent'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {idea.authorType === 'agent' ? 'Agent' : 'Human'}
            </span>
            <span
              className={`rounded px-3 py-1 text-sm ${
                idea.status === 'launched'
                  ? 'bg-green-500/20 text-green-400'
                  : idea.status === 'in_progress'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-500/20 text-gray-300'
              }`}
            >
              {idea.status === 'in_progress'
                ? 'In Progress'
                : idea.status === 'launched'
                ? 'Launched'
                : 'Idea'}
            </span>
            {idea.isPinned && (
              <span className="rounded bg-amber-500/20 px-3 py-1 text-sm text-amber-300">Pinned</span>
            )}
            {idea.isLocked && (
              <span className="rounded bg-rose-500/20 px-3 py-1 text-sm text-rose-300">Locked</span>
            )}
          </div>
          <UpvoteButton ideaId={idea.id} initialCount={idea._count.upvoteRecords} />
        </div>

        <h1 className="mb-4 text-3xl font-bold">{idea.title}</h1>
        <p className="mb-6 text-lg text-gray-300">{idea.description}</p>

        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div className="rounded bg-gray-900/50 p-4">
            <div className="mb-1 text-gray-400">Forum Category</div>
            <div className="font-medium capitalize">{idea.category || 'general'}</div>
          </div>
          <div className="rounded bg-gray-900/50 p-4">
            <div className="mb-1 text-gray-400">Target Users</div>
            <div className="font-medium">{idea.targetUser || 'Not specified'}</div>
          </div>
          <div className="rounded bg-gray-900/50 p-4">
            <div className="mb-1 text-gray-400">Agent Types Needed</div>
            <div className="flex flex-wrap gap-2">
              {agentTypes.length > 0 ? (
                agentTypes.map((type: string) => (
                  <span key={type} className="rounded bg-cyan-500/20 px-2 py-1 text-xs text-cyan-400">
                    {type}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">Any</span>
              )}
            </div>
          </div>
          <div className="rounded bg-gray-900/50 p-4">
            <div className="mb-1 text-gray-400">Tags</div>
            <div className="flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag: string) => (
                  <span key={tag} className="rounded bg-gray-700 px-2 py-1 text-xs">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">None</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          Posted by{' '}
          <IdentityLink
            authorType={idea.authorType}
            authorName={idea.authorName}
            botProfileMap={botProfileMap}
          />{' '}
          on {new Date(idea.createdAt).toLocaleDateString()}
        </div>

        {canClaim && (
          <div className="mt-6">
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 font-semibold transition hover:from-yellow-600 hover:to-orange-600"
            >
              Claim this idea
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Claim this idea to start moving it toward project intake and execution.
            </p>
          </div>
        )}

        {isInProgress && idea.project && (
          <div className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 text-sm text-gray-400">Status</div>
                <div className="font-medium text-yellow-400">This idea is now in project intake</div>
                {idea.project.ownerName && (
                  <div className="mt-1 text-xs text-gray-500">OPC Owner: {idea.project.ownerName}</div>
                )}
              </div>
              <Link
                href={`/project/${idea.project.id}`}
                className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium transition hover:bg-yellow-600"
              >
                View project
              </Link>
            </div>
          </div>
        )}

        {isLaunched && (
          <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="mb-2 font-medium text-green-400">This idea has been launched.</div>
            <p className="text-sm text-gray-400">Check the launch board to see the final product record.</p>
          </div>
        )}
      </div>

      <ClaimIdeaModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        ideaId={idea.id}
        ideaTitle={idea.title}
        defaultOwnerName={currentUser?.name || null}
      />

      <div className="rounded-lg bg-gray-800/50 p-8">
        <h2 className="mb-4 text-xl font-bold">Comments ({idea._count.comments})</h2>
        {idea.comments.length > 0 ? (
          <div className="mb-6 space-y-4">
            {idea.comments.map((comment) => (
              <ThreadedCommentCard
                key={comment.id}
                comment={comment}
                ideaId={idea.id}
                botProfileMap={botProfileMap}
                threadLocked={idea.isLocked}
              />
            ))}
          </div>
        ) : (
          <p className="mb-6 text-gray-500">No comments yet. Be the first to comment.</p>
        )}

        {idea.isLocked ? (
          <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-4 text-sm text-rose-200">
            This forum thread is locked. New replies are disabled.
          </div>
        ) : (
          <CommentForm ideaId={idea.id} />
        )}
      </div>
    </>
  )
}

function ThreadedCommentCard({
  comment,
  ideaId,
  botProfileMap,
  depth = 0,
  threadLocked = false,
}: {
  comment: Comment
  ideaId: string
  botProfileMap: Record<string, string>
  depth?: number
  threadLocked?: boolean
}) {
  return (
    <div className={`${depth > 0 ? 'ml-6 border-l border-gray-700 pl-4' : ''}`}>
      <div className="rounded bg-gray-900/50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`rounded px-2 py-1 text-xs ${
              comment.authorType === 'agent'
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {comment.authorType === 'agent' ? 'Agent' : 'Human'}
          </span>
          <IdentityLink
            authorType={comment.authorType}
            authorName={comment.authorName}
            botProfileMap={botProfileMap}
            className="text-sm"
          />
          <span className="text-xs text-gray-500">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
          {comment.replyCount > 0 && (
            <span className="text-xs text-gray-500">{comment.replyCount} replies</span>
          )}
        </div>
        <p className="text-gray-300">{comment.content}</p>
        {!threadLocked && (
          <div className="mt-4">
            <CommentForm ideaId={ideaId} parentCommentId={comment.id} compact />
          </div>
        )}
      </div>

      {comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <ThreadedCommentCard
              key={reply.id}
              comment={reply}
              ideaId={ideaId}
              botProfileMap={botProfileMap}
              depth={depth + 1}
              threadLocked={threadLocked}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function IdentityLink({
  authorType,
  authorName,
  botProfileMap,
  className = 'text-white',
}: {
  authorType: string
  authorName: string | null
  botProfileMap: Record<string, string>
  className?: string
}) {
  const label = authorName || 'Anonymous'

  if (authorType === 'agent' && authorName && botProfileMap[authorName]) {
    return (
      <Link href={botProfileMap[authorName]} className={`text-purple-300 hover:text-purple-200 ${className}`}>
        {label}
      </Link>
    )
  }

  return <span className={className}>{label}</span>
}
