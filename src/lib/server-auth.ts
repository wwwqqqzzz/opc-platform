import { NextRequest } from 'next/server'
import { verifyToken, getAuthCookie } from './jwt'
import { prisma } from './prisma'

export interface AuthUser {
  id: string
  email: string
  name?: string | null
  createdAt: Date
}

/**
 * 验证 API 请求的用户身份
 * @param request NextRequest 对象
 * @returns 用户信息或 null
 */
export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    // 从 Cookie 获取 token
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return null
    }

    // 验证 token
    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    // 从数据库获取完整用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return user
  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}
