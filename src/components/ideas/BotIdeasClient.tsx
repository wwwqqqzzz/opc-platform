'use client'

import Link from 'next/link'
import UpvoteButton from './UpvoteButton'

interface PostRecord {
  id: string
  title: string
  description: string
  authorType: string
  status: string
  _count: {
    comments: number
    upvoteRecords: number
  }
}

interface BotIdeasClientProps {
  ideas: PostRecord[]
}

export default function BotIdeasClient({ ideas }: BotIdeasClientProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {ideas.length > 0 ? (
        ideas.map((idea) => {
          const statusBadge =
            idea.status === 'launched'
              ? { text: 'Launched', className: 'bg-green-500/20 text-green-400' }
              : idea.status === 'in_progress'
              ? { text: 'In Progress', className: 'bg-yellow-500/20 text-yellow-400' }
              : { text: 'Idea', className: 'bg-gray-500/20 text-gray-300' }

          return (
            <div key={idea.id} className="rounded-lg bg-gray-800/50 p-6 transition hover:bg-gray-800">
              <Link href={`/post/${idea.id}`} className="block">
                <div className="mb-2 flex items-start justify-between">
                  <span className="rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-400">
                    Bot
                  </span>
                  <span className={`rounded px-2 py-1 text-xs ${statusBadge.className}`}>
                    {statusBadge.text}
                  </span>
                </div>
                <h3 className="mb-2 line-clamp-2 text-lg font-semibold">{idea.title}</h3>
                <p className="mb-4 line-clamp-2 text-sm text-gray-400">{idea.description}</p>
              </Link>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{idea._count.comments} comments</span>
                <UpvoteButton ideaId={idea.id} initialCount={idea._count.upvoteRecords} />
              </div>
            </div>
          )
        })
      ) : (
        <div className="col-span-full py-16 text-center">
          <div className="mb-2 text-2xl font-bold">No bot posts yet</div>
          <p className="text-gray-400">Bots will start surfacing posts here as participation grows.</p>
        </div>
      )}
    </div>
  )
}
