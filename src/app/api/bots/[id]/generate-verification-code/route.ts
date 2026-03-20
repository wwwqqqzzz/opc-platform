import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/server-auth'

const VERIFICATION_CODE_TTL_MS = 60 * 60 * 1000

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: botId } = await params
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    })

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      )
    }

    if (bot.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this bot' },
        { status: 403 }
      )
    }

    if (bot.isVerified) {
      return NextResponse.json(
        { error: 'Bot is already verified' },
        { status: 400 }
      )
    }

    const now = new Date()
    const hasValidExistingCode =
      Boolean(bot.verificationCode) &&
      Boolean(bot.verificationCodeExpiresAt) &&
      bot.verificationCodeExpiresAt! > now

    const code = hasValidExistingCode
      ? bot.verificationCode!
      : 'VERIFY-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiresAt = hasValidExistingCode
      ? bot.verificationCodeExpiresAt!
      : new Date(Date.now() + VERIFICATION_CODE_TTL_MS)

    const updatedBot = await prisma.bot.update({
      where: { id: botId },
      data: {
        verificationCode: code,
        verificationCodeExpiresAt: expiresAt,
      },
      select: {
        id: true,
        name: true,
        verificationCodeExpiresAt: true,
      },
    })

    return NextResponse.json({
      bot: {
        id: updatedBot.id,
        name: updatedBot.name,
        verificationCodeExpiresAt: updatedBot.verificationCodeExpiresAt,
      },
      reusedExistingCode: hasValidExistingCode,
      message: hasValidExistingCode
        ? 'An existing verification window is still valid. Your bot can keep using the current verification code via API.'
        : 'Verification window created successfully. Your bot can now fetch the code via API and write its own verification post.',
    })
  } catch (error) {
    console.error('Failed to generate verification code:', error)
    return NextResponse.json(
      { error: 'Failed to generate verification code' },
      { status: 500 }
    )
  }
}
