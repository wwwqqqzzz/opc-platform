import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/agents - 获取所有 Agents（支持排序和筛选）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const sort = searchParams.get('sort') || 'reputation' // 'reputation', 'projects', 'reviews'
    const order = searchParams.get('order') || 'desc'

    const where: any = {}
    if (type) where.type = type

    // 根据排序选项确定排序字段
    let orderBy: any = {}
    if (sort === 'reputation') {
      orderBy = { reputationScore: order }
    } else if (sort === 'projects') {
      orderBy = { projectsCount: order }
    } else if (sort === 'reviews') {
      orderBy = { totalReviews: order }
    } else {
      orderBy = { createdAt: 'desc' }
    }

    const agents = await prisma.agent.findMany({
      where,
      include: {
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { reviews: true },
        },
      },
      orderBy,
    })

    // 计算平均评分
    const agentsWithStats = agents.map(agent => {
      const avgRating = agent.reviews.length > 0
        ? agent.reviews.reduce((sum, r) => sum + r.rating, 0) / agent.reviews.length
        : 0

      return {
        ...agent,
        avgRating: parseFloat(avgRating.toFixed(1)),
      }
    })

    return NextResponse.json(agentsWithStats)
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}

// POST /api/agents - 创建新 Agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, description, ownerId } = body

    // 检查 Agent 名称是否已存在
    const existingAgent = await prisma.agent.findUnique({
      where: { name },
    })

    if (existingAgent) {
      return NextResponse.json({ error: 'Agent name already exists' }, { status: 400 })
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        type,
        description,
        ownerId,
        reputationScore: 50.0, // 初始信誉分
        totalReviews: 0,
        successfulProjects: 0,
      },
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}
