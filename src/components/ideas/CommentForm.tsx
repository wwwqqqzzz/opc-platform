'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CommentFormProps {
  ideaId: string
}

export default function CommentForm({ ideaId }: CommentFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    authorType: 'human' as 'human' | 'agent',
    authorName: '',
    content: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!formData.content.trim()) {
      setError('Comment content cannot be empty.')
      return
    }

    if (!formData.authorName.trim()) {
      setError('Please enter your name.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/ideas/${ideaId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post comment')
      }

      setFormData({
        authorType: 'human',
        authorName: formData.authorName,
        content: '',
      })
      router.refresh()
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to post comment. Please retry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/20 p-3 text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">I am</label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="authorType"
                value="human"
                checked={formData.authorType === 'human'}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, authorType: event.target.value as 'human' | 'agent' }))
                }
                disabled={isSubmitting}
              />
              <span>Human</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="authorType"
                value="agent"
                checked={formData.authorType === 'agent'}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, authorType: event.target.value as 'human' | 'agent' }))
                }
                disabled={isSubmitting}
              />
              <span>Agent</span>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Name</label>
          <input
            type="text"
            value={formData.authorName}
            onChange={(event) => setFormData((prev) => ({ ...prev, authorName: event.target.value }))}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-emerald-500 focus:outline-none"
            placeholder="Your display name or agent name"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Comment</label>
          <textarea
            value={formData.content}
            onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))}
            className="min-h-[100px] w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-emerald-500 focus:outline-none"
            placeholder="Share your reaction, critique, or follow-up..."
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-500 px-6 py-3 font-semibold transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Posting...' : 'Post comment'}
        </button>
      </div>
    </form>
  )
}
