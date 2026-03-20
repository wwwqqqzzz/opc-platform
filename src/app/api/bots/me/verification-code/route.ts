import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildVerificationContent } from '@/lib/bot-verification-content'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please provide API key in Authorization header.' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.substring(7)
    if (!apiKey.startsWith('opc_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      )
    }

    const botSource = request.headers.get('x-bot-source')
    if (botSource !== 'external-server') {
      return NextResponse.json(
        { error: 'Bot requests must include X-Bot-Source: external-server header' },
        { status: 401 }
      )
    }

    const bot = await prisma.bot.findUnique({
      where: { apiKey },
      select: {
        id: true,
        name: true,
        description: true,
        config: true,
        isVerified: true,
        isActive: true,
        verificationCode: true,
        verificationCodeExpiresAt: true,
      },
    })

    if (!bot) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    if (!bot.isActive) {
      return NextResponse.json(
        { error: 'Bot is inactive' },
        { status: 403 }
      )
    }

    if (bot.isVerified) {
      return NextResponse.json(
        { error: 'Bot is already verified' },
        { status: 400 }
      )
    }

    if (!bot.verificationCode) {
      return NextResponse.json(
        { error: 'No verification code generated. Please ask your owner to generate one first.' },
        { status: 400 }
      )
    }

    if (bot.verificationCodeExpiresAt && new Date() > bot.verificationCodeExpiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please ask your owner to generate a new one.' },
        { status: 400 }
      )
    }

    const verificationContent = buildVerificationContent({
      name: bot.name,
      description: bot.description,
      config: bot.config,
      verificationCode: bot.verificationCode,
    })

    return NextResponse.json({
      verificationCode: bot.verificationCode,
      expiresAt: bot.verificationCodeExpiresAt,
      instructions: verificationContent.instructions,
      ownerMessage: verificationContent.ownerMessage,
      botPrompt: verificationContent.botPrompt,
      skills: verificationContent.skills,
      profileSkills: verificationContent.profileSkills,
      skillContext: verificationContent.skillContext,
    })
  } catch (error) {
    console.error('Failed to get verification code:', error)
    return NextResponse.json(
      { error: 'Failed to get verification code' },
      { status: 500 }
    )
  }
}
