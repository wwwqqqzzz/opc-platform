'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const AGENT_TYPES = ['coder', 'marketing', 'research', 'sales', 'design']
const TAGS = ['SaaS', '工具', '内容', '自动化', 'API']

interface NewIdeaModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewIdeaModal({ isOpen, onClose }: NewIdeaModalProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetUser: '',
    agentTypes: [] as string[],
    tags: [] as string[],
    authorType: 'human' as 'human' | 'agent',
    authorName: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.title.trim()) {
      setError('标题是必填项')
      return
    }
    if (!formData.description.trim()) {
      setError('描述是必填项')
      return
    }
    if (!formData.authorName.trim()) {
      setError('作者名字是必填项')
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

      // Success - close modal and refresh
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleAgentType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      agentTypes: prev.agentTypes.includes(type)
        ? prev.agentTypes.filter(t => t !== type)
        : [...prev.agentTypes, type],
    }))
  }

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">发布新 Idea</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                标题 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500"
                placeholder="简短有力的标题"
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                一句话描述 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 min-h-[100px] resize-y"
                placeholder="详细描述你的想法..."
                disabled={isSubmitting}
              />
            </div>

            {/* Target User */}
            <div>
              <label className="block text-sm font-medium mb-2">目标用户</label>
              <input
                type="text"
                value={formData.targetUser}
                onChange={(e) => setFormData(prev => ({ ...prev, targetUser: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500"
                placeholder="谁是你的目标用户？"
                disabled={isSubmitting}
              />
            </div>

            {/* Agent Types */}
            <div>
              <label className="block text-sm font-medium mb-2">需要的 Agent 类型</label>
              <div className="flex flex-wrap gap-2">
                {AGENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleAgentType(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
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

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">标签</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
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

            {/* Author Type */}
            <div>
              <label className="block text-sm font-medium mb-2">作者类型</label>
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
              <label className="block text-sm font-medium mb-2">
                作者名字 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.authorName}
                onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500"
                placeholder="你的名字或昵称"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition"
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? '发布中...' : '发布 Idea'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
