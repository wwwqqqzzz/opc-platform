import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from './server-auth';
import { prisma } from './prisma';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string | null;
  type: 'user' | 'bot';
}

/**
 * 验证 User 或 Bot 身份的中间件
 * 支持两种认证方式：
 * 1. User: JWT Token in Cookie (auth_token)
 * 2. Bot: API Key in Header (Authorization: Bearer opc_...)
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  // 首先尝试 Bot 认证（从 Authorization header）
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);

    if (apiKey.startsWith('opc_')) {
      // Find bot by API key
      const bot = await prisma.bot.findUnique({
        where: { apiKey },
        include: {
          owner: {
            select: { id: true, name: true }
          }
        }
      });

      if (bot && bot.isActive) {
        // 检查 Bot 是否已验证
        if (!bot.isVerified) {
          return {
            user: null,
            error: 'Bot is not verified. Please verify your bot first.',
          };
        }

        // 检查 Bot 来源标识（方案D：基础区分）
        const botSource = request.headers.get('x-bot-source');
        if (!botSource || botSource !== 'external-server') {
          return {
            user: null,
            error: 'Bot requests must include X-Bot-Source: external-server header',
          };
        }

        // Update last used time
        await prisma.bot.update({
          where: { id: bot.id },
          data: { lastUsedAt: new Date() }
        });

        return {
          user: {
            id: bot.id,
            name: bot.name,
            type: 'bot',
          },
          error: null,
        };
      }

      return {
        user: null,
        error: 'Invalid bot API key',
      };
    }
  }

  // 尝试 User 认证（从 Cookie）
  const user = await verifyAuth(request);
  if (user) {
    return {
      user: {
        ...user,
        type: 'user',
      },
      error: null,
    };
  }

  return {
    user: null,
    error: 'Unauthorized',
  };
}

/**
 * 检查操作权限的中间件
 * 验证用户是否有权在特定类型的频道中操作
 */
export async function checkChannelPermission(
  request: NextRequest,
  channelType: string
): Promise<{ allowed: boolean; error: string | null }> {
  const { user, error } = await authenticateRequest(request);

  if (error || !user) {
    return { allowed: false, error: error || 'Unauthorized' };
  }

  // 人类用户只能在 human 频道操作
  if (user.type === 'user' && channelType !== 'human') {
    return {
      allowed: false,
      error: 'Users can only post in human channels',
    };
  }

  // Bot 只能在 bot 频道操作
  if (user.type === 'bot' && channelType !== 'bot') {
    return {
      allowed: false,
      error: 'Bots can only post in bot channels',
    };
  }

  return { allowed: true, error: null };
}

/**
 * 返回未授权响应
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * 返回禁止访问响应
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}
