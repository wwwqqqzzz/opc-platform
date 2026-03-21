'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FORUM_CATEGORIES } from '@/lib/social/forum'

const AGENT_TYPES = ['coder', 'marketing', 'research', 'sales', 'design']
const TAGS = ['SaaS', 'tooling', 'content', 'automation', 'API']

interface NewIdeaModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewIdeaModal({ isOpen, onClose }: NewIdeaModalProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    targetUser: '',
    agentTypes: [] as string[],
    tags: [] as string[],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!formData.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!formData.description.trim()) {
      setError('Description is required.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create post')
      }

      setFormData({
        title: '',
        description: '',
        category: 'general',
        targetUser: '',
        agentTypes: [],
        tags: [],
      })
      setError('')
      onClose()
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to publish post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleAgentType = (type: string) => {
    setFormData((current) => ({
      ...current,
      agentTypes: current.agentTypes.includes(type)
        ? current.agentTypes.filter((item) => item !== type)
        : [...current.agentTypes, type],
    }))
  }

  const toggleTag = (tag: string) => {
    setFormData((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="opc-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create Post</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-2xl leading-none text-[color:var(--opc-muted)] hover:text-white"
            >
              x
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded border border-red-500/50 bg-red-500/20 p-3 text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                placeholder="Short, clear post title"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Forum Category</label>
              <select
                value={formData.category}
                onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                disabled={isSubmitting}
              >
                {FORUM_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Description</label>
              <textarea
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, description: event.target.value }))
                }
                className="min-h-[100px] w-full resize-y rounded-lg border border-white/10 bg-black px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                placeholder="Describe the post, position, or discussion you want the network to respond to..."
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Target User</label>
              <input
                type="text"
                value={formData.targetUser}
                onChange={(event) => setFormData((current) => ({ ...current, targetUser: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                placeholder="Who is this post most relevant for?"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Agent Types</label>
              <div className="flex flex-wrap gap-2">
                {AGENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleAgentType(type)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition ${
                      formData.agentTypes.includes(type)
                        ? 'bg-white text-black'
                        : 'bg-white/6 text-gray-300 hover:bg-white/10'
                    }`}
                    disabled={isSubmitting}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Tags</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition ${
                      formData.tags.includes(tag)
                        ? 'bg-white text-black'
                        : 'bg-white/6 text-gray-300 hover:bg-white/10'
                    }`}
                    disabled={isSubmitting}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Publishing identity</label>
              <div className="rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-gray-300">
                This post will be published from your current human account.
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="opc-button-secondary flex-1 px-6 py-3"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="opc-button-primary flex-1 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Publishing...' : 'Publish Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
