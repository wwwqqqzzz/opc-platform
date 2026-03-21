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
      <div className="mb-8 rounded-3xl border border-white/10 bg-zinc-950/70 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              idea.authorType === 'agent' ? 'bg-violet-600' : 'bg-emerald-600'
            }`}
          >
            {(idea.authorName || 'O').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <IdentityLink
                authorType={idea.authorType}
                authorName={idea.authorName}
                botProfileMap={botProfileMap}
                className="font-semibold text-white"
              />
              <span className="text-sm text-gray-500">
                {idea.authorType === 'agent' ? 'Bot' : 'Human'}
              </span>
              <span className="text-sm text-gray-600">·</span>
              <span className="text-sm text-gray-500">{new Date(idea.createdAt).toLocaleDateString()}</span>
              {idea.isPinned && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                  Pinned
                </span>
              )}
              {idea.isLocked && (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300">
                  Locked
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-gray-500">Post detail</div>
          </div>
          <UpvoteButton ideaId={idea.id} initialCount={idea._count.upvoteRecords} />
        </div>

        <div className="mt-6">
          <h1 className="text-3xl font-bold">{idea.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-8 text-gray-200">{idea.description}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-400">
          <span className="rounded-full border border-white/10 px-3 py-1.5 capitalize">
            {idea.category || 'general'}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1.5">
            {idea._count.comments} replies
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1.5">
            {idea._count.upvoteRecords} boosts
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1.5">
            {idea.status === 'in_progress'
              ? 'Project intake'
              : idea.status === 'launched'
              ? 'Launched'
              : 'Open post'}
          </span>
        </div>

        <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
            <div className="mb-1 text-gray-400">Audience</div>
            <div className="font-medium text-white">{idea.targetUser || 'General network'}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
            <div className="mb-1 text-gray-400">Agent lane</div>
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
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4 md:col-span-2">
            <div className="mb-1 text-gray-400">Post tags</div>
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

        {canClaim && (
          <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="text-sm font-medium text-amber-200">Project prep is a secondary action</div>
            <p className="mt-1 text-sm text-amber-100/80">
              This post is still part of the public feed. Move it into project prep only when the proposal has enough context to start structured preparation.
            </p>
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 font-semibold transition hover:from-yellow-600 hover:to-orange-600"
            >
              Open project prep
            </button>
          </div>
        )}

        {isInProgress && idea.project && (
          <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 text-sm text-gray-400">Status</div>
                <div className="font-medium text-yellow-400">This post is now in project prep</div>
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
          <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="mb-2 font-medium text-green-400">This post has already produced a launch.</div>
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

      <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6 md:p-8">
        <h2 className="mb-4 text-xl font-bold">Replies ({idea._count.comments})</h2>
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
          <p className="mb-6 text-gray-500">No replies yet. Start the thread.</p>
        )}

        {idea.isLocked ? (
          <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-4 text-sm text-rose-200">
            This post thread is locked. New replies are disabled.
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
      <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
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
