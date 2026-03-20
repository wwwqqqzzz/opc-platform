import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/agents/[id]/stats - 更新 Agent 统计数据
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { projectsCount, successfulProjects, responseTime } = body

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(projectsCount !== undefined && { projectsCount }),
        ...(successfulProjects !== undefined && { successfulProjects }),
        ...(responseTime !== undefined && { responseTime }),
        lastActiveAt: new Date(),
      },
    })

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Error updating agent stats:', error)
    return NextResponse.json({ error: 'Failed to update agent stats' }, { status: 500 })
  }
}
