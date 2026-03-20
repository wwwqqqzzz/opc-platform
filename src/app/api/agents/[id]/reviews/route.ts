import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/agents/[id]/reviews - 获取 Agent 的所有评价
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    const where: any = { agentId: id }
    if (category) where.category = category

    const reviews = await prisma.agentReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// POST /api/agents/[id]/reviews - 创建 Agent 评价
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { projectId, rating, category, comment, createdBy } = body

    // 验证评分
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // 检查是否已经评价过
    const existingReview = await prisma.agentReview.findFirst({
      where: {
        agentId: id,
        projectId,
        createdBy,
      },
    })

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this agent for this project' }, { status: 400 })
    }

    // 创建评价
    const review = await prisma.agentReview.create({
      data: {
        agentId: id,
        projectId,
        rating,
        category: category || 'general',
        comment,
        createdBy,
      },
    })

    // 更新 Agent 的统计数据
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        reviews: true,
      },
    })

    if (agent) {
      const totalReviews = agent.reviews.length
      const avgRating = agent.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews

      // 计算新的信誉分数 (使用加权平均)
      // 基础分 50 + (平均评分 - 3) * 10
      // 这样 3 星 = 50 分, 4 星 = 60 分, 5 星 = 70 分
      const newReputationScore = 50 + (avgRating - 3) * 10

      await prisma.agent.update({
        where: { id },
        data: {
          totalReviews,
          reputationScore: Math.max(0, Math.min(100, newReputationScore)), // 限制在 0-100
          lastActiveAt: new Date(),
        },
      })
    }

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}
