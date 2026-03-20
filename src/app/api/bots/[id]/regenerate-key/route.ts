import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/api-key'
import { verifyAuth } from '@/lib/server-auth'

/**
 * POST /api/bots/:id/regenerate-key - 重新生成 Bot 的 API Key
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 验证用户身份
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 检查 Bot 是否存在且属于当前用户
    const bot = await prisma.bot.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
    })

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      )
    }

    // 生成新的 API Key
    const newApiKey = generateApiKey()

    // 更新 Bot
    const updatedBot = await prisma.bot.update({
      where: { id },
      data: { apiKey: newApiKey },
    })

    return NextResponse.json({
      message: 'API Key regenerated successfully',
      bot: updatedBot,
    })
  } catch (error) {
    console.error('Failed to regenerate API key:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate API key' },
      { status: 500 }
    )
  }
}
