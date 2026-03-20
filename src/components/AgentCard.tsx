'use client'

import React from 'react'
import Link from 'next/link'
import { AgentReputationBadge } from './AgentReputationBadge'

export interface Agent {
  id: string
  name: string
  type: string | null
  description: string | null
  reputationScore: number
  totalReviews: number
  projectsCount: number
  successfulProjects: number
  avgRating: number
  reviews: any[]
  _count?: {
    reviews: number
  }
}

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const getAgentTypeLabel = (type: string | null) => {
    const typeLabels: Record<string, string> = {
      coder: '开发者',
      marketing: '市场营销',
      research: '研究员',
      sales: '销售',
      design: '设计师',
    }
    return typeLabels[type || ''] || '通用'
  }

  const getAgentTypeColor = (type: string | null) => {
    const typeColors: Record<string, string> = {
      coder: 'bg-blue-100 text-blue-800',
      marketing: 'bg-pink-100 text-pink-800',
      research: 'bg-purple-100 text-purple-800',
      sales: 'bg-green-100 text-green-800',
      design: 'bg-orange-100 text-orange-800',
    }
    return typeColors[type || ''] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Link href={`/agents/${agent.id}`}>
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
              {agent.type && (
                <span className={`text-xs px-2 py-1 rounded-full ${getAgentTypeColor(agent.type)}`}>
                  {getAgentTypeLabel(agent.type)}
                </span>
              )}
            </div>
            {agent.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{agent.description}</p>
            )}
          </div>
          <AgentReputationBadge score={agent.reputationScore} size="sm" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center border-t pt-3">
          <div>
            <div className="text-2xl font-bold text-gray-900">{agent.projectsCount}</div>
            <div className="text-xs text-gray-500">参与项目</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{agent.avgRating.toFixed(1)}</div>
            <div className="text-xs text-gray-500">平均评分</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{agent.totalReviews}</div>
            <div className="text-xs text-gray-500">评价数</div>
          </div>
        </div>

        {agent.successfulProjects > 0 && (
          <div className="mt-3 text-xs text-green-600">
            ✓ {agent.successfulProjects} 个成功项目
          </div>
        )}
      </div>
    </Link>
  )
}
