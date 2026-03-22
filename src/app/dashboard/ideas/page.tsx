'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import DashboardEmptyState from '@/components/dashboard/DashboardEmptyState'
import NewIdeaModal from '@/components/ideas/NewIdeaModal'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardOnboarding } from '@/hooks/useDashboardExecutionState'

interface PostRecord {
  id: string
  title: string
  description: string
  authorType: string
  userId: string
  status: string
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    title: string
  }
  _count?: {
    comments: number
    upvoteRecords: number
  }
}

type PostFilter = 'all' | 'pending' | 'in_progress' | 'completed'

export default function MyPostsPage() {
  const { user } = useAuth()
  const { onboarding } = useDashboardOnboarding()
  const [posts, setPosts] = useState<PostRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<PostFilter>('all')
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  useEffect(() => {
    if (user) {
      void fetchPosts()
    }
  }, [user])

  const fetchPosts = async () => {
    if (!user) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/posts')
      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      const data: PostRecord[] = await response.json()
      setPosts(data.filter((post) => post.userId === user.id))
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch posts')
    } finally {
      setLoading(false)
    }
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      await fetchPosts()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete post')
    }
  }

  if (!user) {
    return (
      <div className="py-12 text-center">
        <p className="text-[color:var(--opc-muted)]">Please login to view your posts</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[color:var(--opc-muted)]">Loading...</div>
      </div>
    )
  }

  const filteredPosts = posts.filter((post) => filter === 'all' || post.status === filter)
  const preparedPosts = posts.filter((post) => Boolean(post.project)).length
  const stats = [
    { label: 'Total', value: posts.length, filterValue: 'all' as PostFilter },
    { label: 'Pending', value: posts.filter((post) => post.status === 'pending').length, filterValue: 'pending' as PostFilter },
    {
      label: 'In Progress',
      value: posts.filter((post) => post.status === 'in_progress').length,
      filterValue: 'in_progress' as PostFilter,
    },
    {
      label: 'Completed',
      value: posts.filter((post) => post.status === 'completed').length,
      filterValue: 'completed' as PostFilter,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="opc-kicker text-sm">Human posting surface</div>
          <h1 className="mt-1 text-2xl font-bold text-white">Post</h1>
          <p className="mt-1 text-sm text-[color:var(--opc-muted)]">
            Publish from your human control surface and manage every post you already pushed into the public feed.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="opc-button-primary inline-flex items-center px-4 py-2 text-sm"
          >
            New post
          </button>
          <Link
            href="/social"
            className="opc-button-secondary inline-flex items-center px-4 py-2 text-sm"
          >
            Open feed
          </Link>
          {onboarding.activeProject && (
            <Link
              href={`/project/${onboarding.activeProject.id}`}
              className="opc-button-secondary inline-flex items-center px-4 py-2 text-sm"
            >
              Continue active project
            </Link>
          )}
        </div>
      </div>

      <section className="opc-panel-green rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="opc-kicker text-sm">Posting to execution</div>
            <div className="mt-1 text-lg font-medium text-white">{preparedPosts} post(s) already entered project prep</div>
            <p className="mt-2 text-sm text-gray-300">
              Posts are the public signal layer. Once one enters project prep, execution planning moves into the active project flow.
            </p>
          </div>
          <Link
            href={onboarding.ctaHref}
            className="opc-button-secondary px-4 py-2 text-sm"
          >
            {onboarding.ctaLabel}
          </Link>
        </div>
      </section>

      {error && <Banner tone="error" message={error} onClose={() => setError(null)} />}

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setFilter(item.filterValue)}
            className={`opc-panel rounded-lg p-4 text-left transition-colors ${
              filter === item.filterValue
                ? 'border-[var(--opc-green)]'
                : 'border-white/8 hover:border-white/20'
            }`}
          >
            <p className="text-sm font-medium text-[color:var(--opc-muted)]">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
          </button>
        ))}
      </div>

      <div className="opc-panel overflow-hidden rounded-lg">
        {filteredPosts.length === 0 ? (
          posts.length === 0 ? (
            <div className="p-6">
              <DashboardEmptyState
                title="No posts yet"
                description="Your human posting surface is empty. Publish the first post here, then watch replies, follows, and project prep build downstream."
                primaryLabel="Open composer"
                primaryHref="/dashboard/posts"
                secondaryLabel="Open dashboard overview"
                secondaryHref="/dashboard"
              />
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(true)}
                  className="opc-button-primary px-4 py-2 text-sm"
                >
                  New post
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-lg text-[color:var(--opc-muted)]">No posts match the current filter.</p>
            </div>
          )
        ) : (
          <div className="divide-y divide-white/8">
            {filteredPosts.map((post) => (
              <div key={post.id} className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-medium text-white">{post.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusTone(post.status)}`}>
                        {getStatusLabel(post.status)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[color:var(--opc-muted)]">{post.description}</p>
                    <div className="mt-3 flex flex-wrap gap-6 text-sm text-gray-500">
                      <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
                      {post._count && (
                        <>
                          <span>Comments: {post._count.comments}</span>
                          <span>Upvotes: {post._count.upvoteRecords}</span>
                        </>
                      )}
                      {post.project && (
                        <span className="text-emerald-400">
                          Project:{' '}
                          <Link href={`/project/${post.project.id}`} className="hover:underline">
                            {post.project.title}
                          </Link>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/post/${post.id}`}
                      className="opc-button-secondary inline-flex items-center px-3 py-1.5 text-xs"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => deletePost(post.id)}
                      className="inline-flex items-center rounded border border-red-700 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewIdeaModal isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} />
    </div>
  )
}

function Banner({
  tone,
  message,
  onClose,
}: {
  tone: 'error' | 'success'
  message: string
  onClose: () => void
}) {
  const className =
    tone === 'error'
      ? 'border-red-700 bg-red-900/50 text-red-200'
      : 'border-emerald-700 bg-emerald-900/50 text-emerald-200'

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${className}`}>
      <span>{message}</span>
      <button type="button" onClick={onClose} className="text-sm">
        x
      </button>
    </div>
  )
}

function getStatusTone(status: string) {
  switch (status) {
    case 'pending':
      return 'opc-chip-yellow'
    case 'in_progress':
      return 'opc-chip-purple'
    case 'completed':
      return 'opc-chip-green'
    default:
      return 'opc-chip-white'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'in_progress':
      return 'In Progress'
    case 'completed':
      return 'Completed'
    default:
      return status
  }
}
