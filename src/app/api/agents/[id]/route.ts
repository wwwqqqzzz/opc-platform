import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/agents/[id] - 获取单个 Agent 详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        reviews: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { reviews: true },
        },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // 计算统计数据
    const avgRating = agent.reviews.length > 0
      ? agent.reviews.reduce((sum, r) => sum + r.rating, 0) / agent.reviews.length
      : 0

    // 按类别统计评分
    const ratingByCategory: Record<string, { total: number; count: number }> = {}
    agent.reviews.forEach(review => {
      const category = review.category || 'general'
      if (!ratingByCategory[category]) {
        ratingByCategory[category] = { total: 0, count: 0 }
      }
      ratingByCategory[category].total += review.rating
      ratingByCategory[category].count += 1
    })

    const categoryRatings = Object.entries(ratingByCategory).map(([cat, data]) => ({
      category: cat,
      averageRating: parseFloat((data.total / data.count).toFixed(1)),
      count: data.count,
    }))

    return NextResponse.json({
      ...agent,
      avgRating: parseFloat(avgRating.toFixed(1)),
      categoryRatings,
    })
  } catch (error) {
    console.error('Error fetching agent:', error)
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 })
  }
}

// PATCH /api/agents/[id] - 更新 Agent 信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { description, type } = body

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        lastActiveAt: new Date(),
      },
    })

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}
