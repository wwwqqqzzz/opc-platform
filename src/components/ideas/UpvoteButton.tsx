'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UpvoteButtonProps {
  ideaId: string
  initialCount?: number
  showCount?: boolean
  className?: string
}

// Generate or get user ID from localStorage
function getUserId(): string {
  if (typeof window === 'undefined') return ''
  let userId = localStorage.getItem('opc_user_id')
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now()
    localStorage.setItem('opc_user_id', userId)
  }
  return userId
}

// Check if user has upvoted an idea
function hasUpvoted(ideaId: string): boolean {
  if (typeof window === 'undefined') return false
  const upvotedIdeas = JSON.parse(localStorage.getItem('opc_upvoted_ideas') || '[]')
  return upvotedIdeas.includes(ideaId)
}

// Toggle upvote status in localStorage
function toggleUpvote(ideaId: string, upvoted: boolean) {
  if (typeof window === 'undefined') return
  const upvotedIdeas = JSON.parse(localStorage.getItem('opc_upvoted_ideas') || '[]')
  if (upvoted) {
    if (!upvotedIdeas.includes(ideaId)) {
      upvotedIdeas.push(ideaId)
    }
  } else {
    const index = upvotedIdeas.indexOf(ideaId)
    if (index > -1) {
      upvotedIdeas.splice(index, 1)
    }
  }
  localStorage.setItem('opc_upvoted_ideas', JSON.stringify(upvotedIdeas))
}

export default function UpvoteButton({
  ideaId,
  initialCount = 0,
  showCount = true,
  className = '',
}: UpvoteButtonProps) {
  const router = useRouter()
  const [isUpvoted, setIsUpvoted] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize upvote state on mount
  useEffect(() => {
    setIsUpvoted(hasUpvoted(ideaId))
  }, [ideaId])

  const handleUpvote = async () => {
    if (isLoading) return

    setIsLoading(true)
    const userId = getUserId()

    try {
      const response = await fetch('/api/upvote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaId,
          userId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle upvote')
      }

      const data = await response.json()

      // Update local state
      setIsUpvoted(data.upvoted)
      setCount(prev => data.upvoted ? prev + 1 : prev - 1)
      toggleUpvote(ideaId, data.upvoted)

      // Refresh to update server state
      router.refresh()
    } catch (error) {
      console.error('Error toggling upvote:', error)
      // Revert the optimistic update
      setIsUpvoted(isUpvoted)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleUpvote}
      disabled={isLoading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
        isUpvoted
          ? 'bg-pink-500 hover:bg-pink-600 text-white'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <span className="text-lg">{isUpvoted ? '❤️' : '👍'}</span>
      {showCount && <span>{count}</span>}
    </button>
  )
}
