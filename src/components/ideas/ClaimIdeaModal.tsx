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
  const [ownerRole, setOwnerRole] = useState('Founder')
  const [agentTeam, setAgentTeam] = useState('')
  const [initialGoal, setInitialGoal] = useState('')
  const [whyNow, setWhyNow] = useState('')
  const [executionPath, setExecutionPath] = useState('GitHub bridge now, Agent GitHub later')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ownerName.trim()) {
      setError('Please enter your name as the OPC owner.')
      return
    }

    if (!ownerRole.trim() || !initialGoal.trim() || !whyNow.trim()) {
      setError('Owner role, initial goal, and why now are required.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const agentTeamArray = agentTeam
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaId,
          ownerName: ownerName.trim(),
          ownerRole: ownerRole.trim(),
          agentTeam: agentTeamArray,
          initialGoal: initialGoal.trim(),
          whyNow: whyNow.trim(),
          executionPath: executionPath.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to claim post')
      }

      const project = await response.json()
      onClose()
      router.push(`/project/${project.id}?onboarding=1&claimed=1`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to claim post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="opc-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Claim this post</h2>
          <button
            onClick={onClose}
            className="text-2xl text-[color:var(--opc-muted)] hover:text-white"
            disabled={isSubmitting}
            type="button"
          >
            x
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-white/8 bg-black/25 p-3">
          <div className="mb-1 text-sm text-[color:var(--opc-muted)]">Post to claim:</div>
          <div className="font-medium">{ideaTitle}</div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              OPC owner name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-white focus:border-white/30 focus:outline-none"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              Your role in this project <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={ownerRole}
              onChange={(e) => setOwnerRole(e.target.value)}
              placeholder="Founder, operator, researcher, sponsor..."
              className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-white focus:border-white/30 focus:outline-none"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              Initial agent team <span className="text-[color:var(--opc-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              value={agentTeam}
              onChange={(e) => setAgentTeam(e.target.value)}
              placeholder="Coder, designer, researcher"
              className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-white focus:border-white/30 focus:outline-none"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">Enter multiple agent names separated by commas.</p>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              Initial goal <span className="text-red-400">*</span>
            </label>
            <textarea
              value={initialGoal}
              onChange={(e) => setInitialGoal(e.target.value)}
              placeholder="What should this project accomplish first?"
              className="min-h-[96px] w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white focus:border-white/30 focus:outline-none"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              Why now <span className="text-red-400">*</span>
            </label>
            <textarea
              value={whyNow}
              onChange={(e) => setWhyNow(e.target.value)}
              placeholder="Why should this move now instead of staying a post in the feed?"
              className="min-h-[96px] w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white focus:border-white/30 focus:outline-none"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">
              Expected execution path <span className="text-[color:var(--opc-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              value={executionPath}
              onChange={(e) => setExecutionPath(e.target.value)}
              placeholder="GitHub bridge now, Agent GitHub later"
              className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-white focus:border-white/30 focus:outline-none"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              This becomes part of the project intake brief. It does not lock the later execution choice.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="opc-button-secondary flex-1 px-4 py-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="opc-button-primary flex-1 px-4 py-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Claiming...' : 'Claim post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
