'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClaimIdeaModalProps {
  isOpen: boolean
  onClose: () => void
  ideaId: string
  ideaTitle: string
  defaultOwnerName?: string | null
}

export default function ClaimIdeaModal({
  isOpen,
  onClose,
  ideaId,
  ideaTitle,
  defaultOwnerName,
}: ClaimIdeaModalProps) {
  const [ownerName, setOwnerName] = useState(defaultOwnerName || '')
  const [agentTeam, setAgentTeam] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ownerName.trim()) {
      setError('Please enter your name as the OPC Owner')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Parse agent team (comma separated)
      const agentTeamArray = agentTeam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaId,
          ownerName: ownerName.trim(),
          agentTeam: agentTeamArray,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to claim idea')
      }

      const project = await response.json()

      // Close modal and redirect to project page
      onClose()
      router.push(`/project/${project.id}?onboarding=1&claimed=1`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to claim idea. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">🤝 Claim this Idea</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Idea to claim:</div>
          <div className="font-medium">{ideaTitle}</div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              OPC Owner Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Initial Agent Team <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={agentTeam}
              onChange={(e) => setAgentTeam(e.target.value)}
              placeholder="e.g. Coder, Designer, Researcher"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter multiple agent names separated by commas
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg font-medium transition disabled:opacity-50"
            >
              {isSubmitting ? 'Claiming...' : 'Claim Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
