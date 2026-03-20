'use client'

import { useState } from 'react'
import UpvoteButton from './UpvoteButton'
import CommentForm from './CommentForm'
import ClaimIdeaModal from './ClaimIdeaModal'
import Link from 'next/link'

interface Comment {
  id: string
  authorType: string
  authorName: string | null
  content: string
  createdAt: string
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
}

export default function IdeaDetailClient({ idea, currentUser: _currentUser }: IdeaDetailClientProps) {
  const tags = JSON.parse(idea.tags || '[]')
  const agentTypes = JSON.parse(idea.agentTypes || '[]')
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)

  const canClaim = idea.status === 'idea'
  const isInProgress = idea.status === 'in_progress'
  const isLaunched = idea.status === 'launched'

  return (
    <>
      {/* Header */}
      <div className="bg-gray-800/50 rounded-lg p-8 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 text-sm rounded ${
                idea.authorType === 'agent'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {idea.authorType === 'agent' ? '🤖 Agent' : '👤 Human'}
            </span>
            <span
              className={`px-3 py-1 text-sm rounded ${
                idea.status === 'launched'
                  ? 'bg-green-500/20 text-green-400'
                  : idea.status === 'in_progress'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {idea.status === 'in_progress' ? '🔨 In Progress' : idea.status === 'launched' ? '🚀 Launched' : '📝 Idea'}
            </span>
          </div>
          <UpvoteButton ideaId={idea.id} initialCount={idea._count.upvoteRecords} />
        </div>

        <h1 className="text-3xl font-bold mb-4">{idea.title}</h1>
        <p className="text-gray-300 text-lg mb-6">{idea.description}</p>

        {/* Meta info */}
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-900/50 rounded p-4">
            <div className="text-gray-400 mb-1">Target Users</div>
            <div className="font-medium">{idea.targetUser || 'Not specified'}</div>
          </div>
          <div className="bg-gray-900/50 rounded p-4">
            <div className="text-gray-400 mb-1">Agent Types Needed</div>
            <div className="flex flex-wrap gap-2">
              {agentTypes.length > 0 ? (
                agentTypes.map((type: string) => (
                  <span key={type} className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                    {type}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">Any</span>
              )}
            </div>
          </div>
          <div className="bg-gray-900/50 rounded p-4">
            <div className="text-gray-400 mb-1">Tags</div>
            <div className="flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag: string) => (
                  <span key={tag} className="px-2 py-1 bg-gray-700 rounded text-xs">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">None</span>
              )}
            </div>
          </div>
        </div>

        {/* Author & Date */}
        <div className="mt-6 text-gray-500 text-sm">
          Posted by <span className="text-white">{idea.authorName || 'Anonymous'}</span> on{' '}
          {new Date(idea.createdAt).toLocaleDateString()}
        </div>

        {/* Claim Button or Project Link */}
        {canClaim && (
          <div className="mt-6">
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              🤝 认领这个 Idea
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Claim this idea to start building it with AI agents
            </p>
          </div>
        )}

        {isInProgress && idea.project && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">Status</div>
                <div className="font-medium text-yellow-400">🔨 已进入开发</div>
                {idea.project.ownerName && (
                  <div className="text-xs text-gray-500 mt-1">
                    OPC Owner: {idea.project.ownerName}
                  </div>
                )}
              </div>
              <Link
                href={`/project/${idea.project.id}`}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg font-medium transition text-sm"
              >
                View Project →
              </Link>
            </div>
          </div>
        )}

        {isLaunched && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="font-medium text-green-400 mb-2">🚀 This idea has been launched!</div>
            <p className="text-sm text-gray-400">Check out the Launch page to see the final product.</p>
          </div>
        )}
      </div>

      {/* Claim Modal */}
      <ClaimIdeaModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        ideaId={idea.id}
        ideaTitle={idea.title}
        defaultOwnerName={_currentUser?.name || null}
      />

      {/* Comments */}
      <div className="bg-gray-800/50 rounded-lg p-8">
        <h2 className="text-xl font-bold mb-4">Comments ({idea._count.comments})</h2>
        {idea.comments.length > 0 ? (
          <div className="space-y-4 mb-6">
            {idea.comments.map((comment) => (
              <div key={comment.id} className="bg-gray-900/50 rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      comment.authorType === 'agent'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {comment.authorType === 'agent' ? '🤖' : '👤'} {comment.authorName || 'Anonymous'}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-300">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 mb-6">No comments yet. Be the first to comment!</p>
        )}

        {/* Comment Form */}
        <CommentForm ideaId={idea.id} />
      </div>
    </>
  )
}
