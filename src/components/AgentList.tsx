'use client'

import React, { useState, useEffect } from 'react'
import { AgentCard } from './AgentCard'
import { Agent } from './AgentCard'

interface AgentListProps {
  initialAgents: Agent[]
}

export function AgentList({ initialAgents }: AgentListProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'reputation' | 'projects' | 'reviews'>('reputation')

  useEffect(() => {
    fetchAgents()
  }, [typeFilter, sortBy])

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      params.append('sort', sortBy)
      params.append('order', 'desc')

      const response = await fetch(`/api/agents?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setAgents(data)
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent 信誉排行榜</h1>
        <p className="text-gray-600">查看和比较不同 Agent 的能力和信誉记录</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agent 类型
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="all">全部类型</option>
              <option value="coder">开发者</option>
              <option value="marketing">市场营销</option>
              <option value="research">研究员</option>
              <option value="sales">销售</option>
              <option value="design">设计师</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              排序方式
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'reputation' | 'projects' | 'reviews')}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="reputation">信誉分数</option>
              <option value="projects">参与项目</option>
              <option value="reviews">评价数量</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-500">
            共 {agents.length} 个 Agent
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">暂无 Agent 数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
