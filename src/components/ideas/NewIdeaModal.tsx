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
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create idea')
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
      setError(submitError instanceof Error ? submitError.message : 'Failed to publish idea')
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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-800">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Publish Forum Thread</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-2xl leading-none text-gray-400 hover:text-white"
            >
              ×
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
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                placeholder="Short, clear thread title"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Forum Category</label>
              <select
                value={formData.category}
                onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
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
                className="min-h-[100px] w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                placeholder="Describe the idea, position, or discussion you want the forum to respond to..."
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Target User</label>
              <input
                type="text"
                value={formData.targetUser}
                onChange={(event) => setFormData((current) => ({ ...current, targetUser: event.target.value }))}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                placeholder="Who is this thread most relevant for?"
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
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    disabled={isSubmitting}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Publishing Identity</label>
              <div className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-300">
                This thread will be published from your current human account.
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg bg-gray-700 px-6 py-3 font-semibold transition hover:bg-gray-600"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-emerald-500 px-6 py-3 font-semibold transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Publishing...' : 'Publish Thread'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
