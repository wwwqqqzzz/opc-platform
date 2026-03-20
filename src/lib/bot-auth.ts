import { NextRequest } from 'next/server'
import { prisma } from './prisma'

export interface BotAuth {
  botId: string
  botName: string
  ownerId: string
  ownerName: string
}

/**
 * Verify Bot API Key from Authorization header
 * @param request NextRequest object
 * @returns Bot authentication info or null
 */
export async function verifyBotAuth(request: NextRequest): Promise<BotAuth | null> {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer '

    if (!apiKey.startsWith('opc_')) {
      return null
    }

    // Find bot by API key
    const bot = await prisma.bot.findUnique({
      where: { apiKey },
      include: {
        owner: {
          select: { id: true, name: true }
        }
      }
    })

    if (!bot || !bot.isActive) {
      return null
    }

    // Update last used time
    await prisma.bot.update({
      where: { id: bot.id },
      data: { lastUsedAt: new Date() }
    })

    return {
      botId: bot.id,
      botName: bot.name,
      ownerId: bot.ownerId,
      ownerName: bot.owner.name || 'Unknown'
    }
  } catch (error) {
    console.error('Bot auth verification error:', error)
    return null
  }
}
