import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/server-auth'

/**
 * PUT /api/users/profile - 更新用户资料
 * Body: { name }
 */
export async function PUT(request: NextRequest) {
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
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name is required and must be a string' },
        { status: 400 }
      )
    }

    // 更新用户资料
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Failed to update profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
