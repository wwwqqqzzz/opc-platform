# 🚨 严重安全漏洞修复

## 问题描述

**漏洞：** 随便填一个假URL就能验证成功

**原因：** 验证逻辑没有真正检查URL内容

---

## 正确的验证流程

```
用户提交 URL
    ↓
系统抓取 URL 内容（HTTP GET）
    ↓
检查HTML/文本中是否包含验证码
    ↓
✅ 包含 → 验证通过
❌ 不包含 → 验证失败
```

---

## 修复代码

### src/app/api/bots/[id]/verify-bot/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTwitter, verifyURL } from '@/lib/verifiers/twitter'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: botId } = await params
    const body = await request.json()
    const { verificationUrl } = body

    // 1. 验证 URL 格式
    if (!verificationUrl || !verificationUrl.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid URL format. Must start with http:// or https://' },
        { status: 400 }
      )
    }

    // 2. 获取 Bot 信息
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: {
        id: true,
        name: true,
        isVerified: true,
        verificationCode: true,
        verificationCodeExpiresAt: true,
      },
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
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

    // 3. 检查验证码是否过期
    if (bot.verificationCodeExpiresAt && new Date() > bot.verificationCodeExpiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please generate a new one.' },
        { status: 400 }
      )
    }

    // 4. 🔒 核心验证逻辑：抓取URL并检查验证码
    console.log(`🔍 Verifying bot ${botId} with URL: ${verificationUrl}`)
    
    let verificationResult;
    
    try {
      // 检测平台并使用对应的验证器
      if (verificationUrl.includes('twitter.com') || verificationUrl.includes('x.com')) {
        // Twitter 使用 Nitter
        verificationResult = await verifyTwitter(verificationUrl, bot.verificationCode)
      } else {
        // 其他平台直接抓取
        verificationResult = await verifyURL(verificationUrl, bot.verificationCode)
      }

      if (!verificationResult.success) {
        return NextResponse.json(
          {
            error: verificationResult.error || 'Verification failed',
            hint: `The URL content must include the verification code: ${bot.verificationCode}`,
          },
          { status: 400 }
        )
      }

      console.log(`✅ Verification successful: ${verificationUrl}`)
    } catch (error) {
      console.error('Verification error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to verify URL. Please make sure the URL is publicly accessible.',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      )
    }

    // 5. 验证通过，更新 Bot 状态
    const updatedBot = await prisma.bot.update({
      where: { id: botId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verificationUrl: verificationUrl,
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
```

---

## 测试

### 正常验证（应该成功）

```bash
# 1. Bot 发布包含验证码的推文
URL: https://x.com/user/status/123
内容: "验证码：VERIFY-ABC123"

# 2. 提交验证
POST /api/bots/:id/verify-bot
Body: { "verificationUrl": "https://x.com/user/status/123" }

# 3. 结果
✅ 验证通过（验证码匹配）
```

### 假URL验证（应该失败）

```bash
# 1. 提交假URL
POST /api/bots/:id/verify-bot
Body: { "verificationUrl": "https://google.com/fake" }

# 2. 结果
❌ 验证失败（内容不包含验证码）
错误: "Verification code not found in URL content"
```

---

## 安全检查清单

- [ ] URL 格式验证
- [ ] 验证码存在检查
- [ ] 验证码过期检查
- [ ] **URL内容抓取**
- [ ] **验证码匹配检查**
- [ ] 错误处理
- [ ] 日志记录

---

## 部署

1. 更新代码
2. 重启服务器
3. 测试验证流程
4. 确认漏洞已修复

---

**创建时间：** 2026-03-19 00:35
**优先级：** 🔴 P0（严重安全漏洞）
