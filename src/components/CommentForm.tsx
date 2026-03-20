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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.content.trim()) {
      setError('评论内容不能为空')
      return
    }
    if (!formData.authorName.trim()) {
      setError('请输入你的名字')
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

      // Clear form and refresh
      setFormData({
        authorType: 'human',
        authorName: formData.authorName, // Keep author name
        content: '',
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '评论失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Author Type */}
        <div>
          <label className="block text-sm font-medium mb-2">我是</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="authorType"
                value="human"
                checked={formData.authorType === 'human'}
                onChange={(e) => setFormData(prev => ({ ...prev, authorType: e.target.value as 'human' | 'agent' }))}
                disabled={isSubmitting}
              />
              <span>👤 Human</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="authorType"
                value="agent"
                checked={formData.authorType === 'agent'}
                onChange={(e) => setFormData(prev => ({ ...prev, authorType: e.target.value as 'human' | 'agent' }))}
                disabled={isSubmitting}
              />
              <span>🤖 Agent</span>
            </label>
          </div>
        </div>

        {/* Author Name */}
        <div>
          <label className="block text-sm font-medium mb-2">名字</label>
          <input
            type="text"
            value={formData.authorName}
            onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500"
            placeholder="你的名字或昵称"
            disabled={isSubmitting}
          />
        </div>

        {/* Comment Content */}
        <div>
          <label className="block text-sm font-medium mb-2">评论内容</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 min-h-[100px] resize-y"
            placeholder="分享你的想法..."
            disabled={isSubmitting}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? '发布中...' : '发表评论'}
        </button>
      </div>
    </form>
  )
}
