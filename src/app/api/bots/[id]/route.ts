import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/server-auth'

/**
 * GET /api/bots/:id - 获取单个 Bot 详情
 */
export async function GET(
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

    const bot = await prisma.bot.findFirst({
      where: {
        id,
        ownerId: user.id, // 只能获取自己的 Bot
      },
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
        { error: 'Bot not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(bot)
  } catch (error) {
    console.error('Failed to fetch bot:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bot' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/bots/:id - 更新 Bot
 * Body: { name, description, config, isActive }
 */
export async function PUT(
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

    const body = await request.json()
    const { name, description, config, isActive } = body

    // 构建更新数据对象
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (config !== undefined) updateData.config = JSON.stringify(config)
    if (isActive !== undefined) updateData.isActive = isActive

    // 验证 Bot 是否属于当前用户
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

    const updatedBot = await prisma.bot.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedBot)
  } catch (error) {
    console.error('Failed to update bot:', error)
    return NextResponse.json(
      { error: 'Failed to update bot' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/bots/:id - 删除 Bot
 */
export async function DELETE(
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

    // 验证 Bot 是否属于当前用户
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

    await prisma.bot.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: 'Bot deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete bot:', error)
    return NextResponse.json(
      { error: 'Failed to delete bot' },
      { status: 500 }
    )
  }
}
