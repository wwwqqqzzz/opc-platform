'use client'

import React from 'react'

interface AgentReputationBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export function AgentReputationBadge({ score, size = 'md' }: AgentReputationBadgeProps) {
  // 根据分数确定等级和颜色
  const getReputationLevel = (score: number) => {
    if (score >= 90) return { level: '卓越', color: 'text-purple-600', bg: 'bg-purple-100' }
    if (score >= 80) return { level: '优秀', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 70) return { level: '良好', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 60) return { level: '合格', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (score >= 40) return { level: '发展中', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { level: '新手', color: 'text-gray-600', bg: 'bg-gray-100' }
  }

  const { level, color, bg } = getReputationLevel(score)

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full ${bg} ${color} ${sizeClasses[size]}`}>
      <span className="font-semibold">{score.toFixed(0)}</span>
      <span className="text-xs opacity-75">{level}</span>
    </div>
  )
}
