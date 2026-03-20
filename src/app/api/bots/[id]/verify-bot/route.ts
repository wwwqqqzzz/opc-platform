import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/server-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: botId } = await params
    const body = await request.json()
    const { verificationUrl } = body

    if (!verificationUrl || !verificationUrl.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid URL format. Must start with http:// or https://' },
        { status: 400 }
      )
    }

    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        isVerified: true,
        verificationCode: true,
        verificationCodeExpiresAt: true,
      },
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
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

    if (!bot.verificationCode) {
      return NextResponse.json(
        { error: 'No verification code generated. Please generate one first.' },
        { status: 400 }
      )
    }

    if (bot.verificationCodeExpiresAt && new Date() > bot.verificationCodeExpiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please generate a new one.' },
        { status: 400 }
      )
    }

    console.log(`[Bot Verify] Verifying bot ${botId} with URL: ${verificationUrl}`)

    try {
      let verificationSuccess = false
      let lastError: string | null = null

      if (verificationUrl.includes('twitter.com') || verificationUrl.includes('x.com')) {
        verificationSuccess = await verifyTwitterViaNitter(verificationUrl, bot.verificationCode)
        if (!verificationSuccess) {
          lastError = 'All Twitter/X mirrors failed, or the published post content did not include the current verification code.'
        }
      } else {
        verificationSuccess = await verifyGenericURL(verificationUrl, bot.verificationCode)
        if (!verificationSuccess) {
          lastError = 'The verification code was not found in the fetched page content.'
        }
      }

      if (!verificationSuccess) {
        const isTwitter = verificationUrl.includes('twitter.com') || verificationUrl.includes('x.com')

        return NextResponse.json(
          {
            error: isTwitter ? 'Twitter/X verification failed' : 'Verification failed',
            details: lastError || 'Verification code not found in URL content',
            solution: isTwitter
              ? [
                  'Twitter/X verification depends on third-party mirrors and may fail because of rate limits or anti-bot protection.',
                  'Recommended fallback platforms: GitHub Gist, public blog, Zhihu, Weibo, Jike, Juejin, or CSDN.',
                  'Ask your bot to fetch the current code again from GET /api/bots/me/verification-code, publish a fresh public post, then submit that new URL.',
                ].join('\n\n')
              : 'Make sure the page is publicly accessible and that the bot-published content includes the exact current verification code from GET /api/bots/me/verification-code.',
            debug: {
              url: verificationUrl,
              platform: isTwitter ? 'twitter' : 'generic',
            },
          },
          { status: 400 }
        )
      }
    } catch (error) {
      console.error('[Bot Verify] Verification error:', error)
      return NextResponse.json(
        {
          error: 'Failed to verify URL',
          details: error instanceof Error ? error.message : 'Unknown error',
          hint: 'Please make sure the URL is publicly accessible and contains the current verification code.',
        },
        { status: 400 }
      )
    }

    const updatedBot = await prisma.bot.update({
      where: { id: botId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verificationUrl,
      },
      select: {
        id: true,
        name: true,
        isVerified: true,
        verifiedAt: true,
        verificationUrl: true,
      },
    })

    return NextResponse.json({
      message: 'Bot verified successfully!',
      bot: updatedBot,
    })
  } catch (error) {
    console.error('Verify bot error:', error)
    return NextResponse.json(
      { error: 'Failed to verify bot' },
      { status: 500 }
    )
  }
}

function isChallengePage(html: string): boolean {
  const challengeIndicators = [
    'Verifying your browser',
    'Just a moment...',
    'Cloudflare',
    'cf-browser-verification',
    'challenge-platform',
    'jschl_vc',
    '__cf_chl_opt',
    'Enable JavaScript and cookies',
    'Checking your browser',
    'DDoS protection by',
    'Ray ID:',
  ]

  const lowerHtml = html.toLowerCase()
  return challengeIndicators.some((indicator) =>
    lowerHtml.includes(indicator.toLowerCase())
  )
}

async function verifyTwitterViaNitter(url: string, code: string): Promise<boolean> {
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/)
  if (!match) {
    throw new Error('Invalid Twitter URL format')
  }

  const username = match[1]
  const tweetId = match[2]
  const errors: Array<{ instance: string; error: string }> = []

  const vxtwitterUrl = `https://api.vxtwitter.com/${username}/status/${tweetId}`
  try {
    const response = await fetch(vxtwitterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) {
      const data = await response.json()
      const tweetText = data.text || ''
      if (tweetText.includes(code)) {
        return true
      }
      errors.push({ instance: 'vxtwitter', error: 'Code not found in tweet text' })
    } else {
      errors.push({ instance: 'vxtwitter', error: `HTTP ${response.status}` })
    }
  } catch (error) {
    errors.push({
      instance: 'vxtwitter',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  const proxyInstances = [
    'nitter.net',
    'nitter.poast.org',
    'nitter.privacydev.net',
    'nitter.mint.lgbt',
    'nitter.esmailelbob.xyz',
    'xcancel.com',
    'sotwe.com',
    'twstalker.com',
  ]

  for (const instance of proxyInstances) {
    try {
      const proxyUrl = `https://${instance}/${username}/status/${tweetId}`
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) {
        errors.push({ instance, error: `HTTP ${response.status}` })
        continue
      }

      const html = await response.text()
      if (!html || html.trim().length < 100 || isChallengePage(html)) {
        errors.push({ instance, error: 'Blocked, empty, or challenge page' })
        continue
      }

      if (html.includes(code)) {
        return true
      }

      errors.push({ instance, error: 'Code not found in content' })
    } catch (error) {
      errors.push({
        instance,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  console.error('[Twitter Verify] All mirrors failed:', errors)
  return false
}

async function verifyGenericURL(url: string, code: string): Promise<boolean> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'OPC-Platform-Verifier/1.0',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }

  const content = await response.text()
  return content.includes(code)
}
