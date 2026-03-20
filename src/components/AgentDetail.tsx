'use client'

import React, { useState } from 'react'
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
  responseTime: number | null
  avgRating: number
  categoryRatings?: {
    category: string
    averageRating: number
    count: number
  }[]
  reviews: {
    id: string
    rating: number
    category: string | null
    comment: string | null
    createdAt: Date
    createdBy: string
    projectId: string
  }[]
}

interface AgentDetailProps {
  agent: Agent
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const getCategoryLabel = (category: string | null) => {
    const labels: Record<string, string> = {
      general: '综合评价',
      code_quality: '代码质量',
      communication: '沟通能力',
      speed: '响应速度',
      problem_solving: '问题解决',
    }
    return labels[category || ''] || category || '综合评价'
  }

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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ))
  }

  const filteredReviews = selectedCategory
    ? agent.reviews.filter(r => r.category === selectedCategory)
    : agent.reviews

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{agent.name}</h1>
            <div className="flex items-center gap-2">
              {agent.type && (
                <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                  {getAgentTypeLabel(agent.type)}
                </span>
              )}
              {agent.responseTime && (
                <span className="text-sm text-gray-500">
                  平均响应时间: {agent.responseTime.toFixed(1)} 小时
                </span>
              )}
            </div>
          </div>
          <AgentReputationBadge score={agent.reputationScore} size="lg" />
        </div>

        {agent.description && (
          <p className="text-gray-700 mb-4">{agent.description}</p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 border-t pt-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{agent.reputationScore.toFixed(0)}</div>
            <div className="text-sm text-gray-500">信誉分数</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{agent.avgRating.toFixed(1)}</div>
            <div className="text-sm text-gray-500">平均评分</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{agent.totalReviews}</div>
            <div className="text-sm text-gray-500">评价数</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{agent.projectsCount}</div>
            <div className="text-sm text-gray-500">参与项目</div>
          </div>
        </div>
      </div>

      {/* Category Ratings */}
      {agent.categoryRatings && agent.categoryRatings.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">分类评分</h2>
          <div className="space-y-3">
            {agent.categoryRatings.map((cr) => (
              <div key={cr.category} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {getCategoryLabel(cr.category)}
                    </span>
                    <span className="text-sm text-gray-600">{cr.averageRating.toFixed(1)} / 5.0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(cr.averageRating / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-sm text-gray-500">({cr.count} 条评价)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">用户评价</h2>
          <select
            value={selectedCategory || 'all'}
            onChange={(e) => setSelectedCategory(e.target.value === 'all' ? null : e.target.value)}
            className="text-sm border rounded px-3 py-2"
          >
            <option value="all">全部类别</option>
            <option value="code_quality">代码质量</option>
            <option value="communication">沟通能力</option>
            <option value="speed">响应速度</option>
            <option value="problem_solving">问题解决</option>
          </select>
        </div>

        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无评价</p>
          ) : (
            filteredReviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(review.rating)}</div>
                    <span className="font-medium">{review.createdBy}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {review.category && (
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {getCategoryLabel(review.category)}
                      </span>
                    )}
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 text-sm">{review.comment}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
