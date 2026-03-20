import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/api-key'
import { verifyAuth } from '@/lib/server-auth'

/**
 * GET /api/bots - 获取当前用户的所有 Bot
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const bots = await prisma.bot.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        apiKey: true,
        config: true,
        isActive: true,
        lastUsedAt: true,
        isVerified: true,
        verifiedAt: true,
        verificationUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(bots)
  } catch (error) {
    console.error('Failed to fetch bots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bots' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bots - 创建新 Bot
 * Body: { name, description, config }
 * ownerId 从认证中自动获取
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, config } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    // 生成唯一的 API Key
    const apiKey = generateApiKey()

    // 创建 Bot，自动绑定到当前用户
    const bot = await prisma.bot.create({
      data: {
        name,
        description,
        apiKey,
        ownerId: user.id,
        config: config ? JSON.stringify(config) : null,
      },
    })

    return NextResponse.json(bot, { status: 201 })
  } catch (error) {
    console.error('Failed to create bot:', error)
    return NextResponse.json(
      { error: 'Failed to create bot' },
      { status: 500 }
    )
  }
}
