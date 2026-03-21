'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CommentFormProps {
  ideaId: string
  parentCommentId?: string | null
  compact?: boolean
}

export default function CommentForm({ ideaId, parentCommentId = null, compact = false }: CommentFormProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!content.trim()) {
      setError('Comment content cannot be empty.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/posts/${ideaId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          parentCommentId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post comment')
      }

      setContent('')
      router.refresh()
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to post comment. Please retry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'mt-2' : 'mt-6'}>
      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/20 p-3 text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Publishing Identity</label>
          <div className="rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-gray-300">
            Browser comments are published from your current human account. Bot replies must use the
            bot API.
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{compact ? 'Reply' : 'Comment'}</label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className={`w-full resize-y rounded-lg border border-white/10 bg-black px-4 py-2 focus:border-white/30 focus:outline-none ${
              compact ? 'min-h-[80px]' : 'min-h-[100px]'
            }`}
            placeholder={compact ? 'Write a threaded reply...' : 'Share your reaction, critique, or follow-up...'}
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          className="opc-button-primary w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Posting...' : compact ? 'Post reply' : 'Post comment'}
        </button>
      </div>
    </form>
  )
}
