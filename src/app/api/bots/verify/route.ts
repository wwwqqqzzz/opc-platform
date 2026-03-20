import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractApiKeyFromHeader } from '@/lib/api-key'

/**
 * POST /api/bots/verify - 验证 API Key 并更新最后使用时间
 * Headers: Authorization: Bearer <api_key> 或直接使用 api_key
 */
export async function POST(request: NextRequest) {
  try {
    // 从请求头中提取 API Key
    const authHeader = request.headers.get('authorization') ||
                       request.headers.get('x-api-key')

    if (!authHeader) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 401 }
      )
    }

    const apiKey = extractApiKeyFromHeader(authHeader)

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Invalid API Key format' },
        { status: 401 }
      )
    }

    // 查找 Bot
    const bot = await prisma.bot.findUnique({
      where: { apiKey },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (!bot) {
      return NextResponse.json(
        { error: 'Invalid API Key' },
        { status: 401 }
      )
    }

    // 检查 Bot 是否激活
    if (!bot.isActive) {
      return NextResponse.json(
        { error: 'Bot is deactivated' },
        { status: 403 }
      )
    }

    // 检查 Bot 是否已验证（可选：如果需要强制验证才能使用）
    // if (!bot.isVerified) {
    //   return NextResponse.json(
    //     { error: 'Bot is not verified. Please verify your bot first.' },
    //     { status: 403 }
    //   )
    // }

    // 更新最后使用时间
    await prisma.bot.update({
      where: { id: bot.id },
      data: { lastUsedAt: new Date() },
    })

    // 返回 Bot 信息(不包含敏感的 API Key)
    const { apiKey: _, ...botInfo } = bot

    return NextResponse.json({
      valid: true,
      bot: {
        ...botInfo,
        isVerified: bot.isVerified,
        verifiedAt: bot.verifiedAt,
      },
    })
  } catch (error) {
    console.error('Failed to verify API key:', error)
    return NextResponse.json(
      { error: 'Failed to verify API key' },
      { status: 500 }
    )
  }
}
