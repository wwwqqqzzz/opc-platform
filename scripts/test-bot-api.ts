/**
 * Bot API 测试脚本
 *
 * 使用方法:
 * 1. 确保 dev server 正在运行: npm run dev
 * 2. 运行测试: npx tsx scripts/test-bot-api.ts
 */

const API_BASE = 'http://localhost:3001'

// 测试用的用户 ID
const TEST_USER_ID = 'test-user-id'

let createdBotId: string | null = null
let createdApiKey: string | null = null

async function testCreateUser() {
  console.log('\n1. 创建测试用户...')
  try {
    const response = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      }),
    })

    if (response.ok) {
      const user = await response.json()
      console.log('✓ 用户创建成功:', user.id)
      return user.id
    } else if (response.status === 400) {
      // 用户可能已存在,尝试获取
      console.log('用户可能已存在,尝试获取...')
      return TEST_USER_ID
    }
  } catch (error) {
    console.log('✗ 创建用户失败(可能用户已存在),使用默认 ID')
  }
  return TEST_USER_ID
}

async function testCreateBot(userId: string) {
  console.log('\n2. 创建新 Bot...')
  try {
    const response = await fetch(`${API_BASE}/api/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Bot',
        description: 'This is a test bot for API testing',
        userId,
        config: { model: 'gpt-4', temperature: 0.7 },
      }),
    })

    if (response.ok) {
      const bot = await response.json()
      console.log('✓ Bot 创建成功:')
      console.log('  - ID:', bot.id)
      console.log('  - Name:', bot.name)
      console.log('  - API Key:', bot.apiKey)
      createdBotId = bot.id
      createdApiKey = bot.apiKey
      return bot
    } else {
      const error = await response.json()
      console.log('✗ 创建 Bot 失败:', error)
      return null
    }
  } catch (error) {
    console.log('✗ 创建 Bot 失败:', error)
    return null
  }
}

async function testGetBots(userId: string) {
  console.log('\n3. 获取用户的所有 Bot...')
  try {
    const response = await fetch(`${API_BASE}/api/bots?userId=${userId}`)

    if (response.ok) {
      const bots = await response.json()
      console.log(`✓ 获取成功,共 ${bots.length} 个 Bot:`)
      bots.forEach((bot: any, index: number) => {
        console.log(`  ${index + 1}. ${bot.name} (${bot.id})`)
      })
      return bots
    } else {
      console.log('✗ 获取 Bot 列表失败')
      return []
    }
  } catch (error) {
    console.log('✗ 获取 Bot 列表失败:', error)
    return []
  }
}

async function testGetBot(botId: string) {
  console.log('\n4. 获取单个 Bot 详情...')
  try {
    const response = await fetch(`${API_BASE}/api/bots/${botId}`)

    if (response.ok) {
      const bot = await response.json()
      console.log('✓ Bot 详情:')
      console.log('  - Name:', bot.name)
      console.log('  - Description:', bot.description)
      console.log('  - Active:', bot.isActive)
      return bot
    } else {
      console.log('✗ 获取 Bot 详情失败')
      return null
    }
  } catch (error) {
    console.log('✗ 获取 Bot 详情失败:', error)
    return null
  }
}

async function testUpdateBot(botId: string) {
  console.log('\n5. 更新 Bot...')
  try {
    const response = await fetch(`${API_BASE}/api/bots/${botId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Test Bot',
        description: 'This bot has been updated',
      }),
    })

    if (response.ok) {
      const bot = await response.json()
      console.log('✓ Bot 更新成功:')
      console.log('  - New Name:', bot.name)
      console.log('  - New Description:', bot.description)
      return bot
    } else {
      console.log('✗ 更新 Bot 失败')
      return null
    }
  } catch (error) {
    console.log('✗ 更新 Bot 失败:', error)
    return null
  }
}

async function testVerifyApiKey(apiKey: string) {
  console.log('\n6. 验证 API Key...')
  try {
    const response = await fetch(`${API_BASE}/api/bots/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✓ API Key 验证成功:')
      console.log('  - Valid:', result.valid)
      console.log('  - Bot Name:', result.bot.name)
      return result
    } else {
      const error = await response.json()
      console.log('✗ API Key 验证失败:', error)
      return null
    }
  } catch (error) {
    console.log('✗ API Key 验证失败:', error)
    return null
  }
}

async function testRegenerateApiKey(botId: string) {
  console.log('\n7. 重新生成 API Key...')
  try {
    const response = await fetch(`${API_BASE}/api/bots/${botId}/regenerate-key`, {
      method: 'POST',
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✓ API Key 重新生成成功:')
      console.log('  - Old Key:', createdApiKey)
      console.log('  - New Key:', result.bot.apiKey)
      createdApiKey = result.bot.apiKey
      return result
    } else {
      console.log('✗ 重新生成 API Key 失败')
      return null
    }
  } catch (error) {
    console.log('✗ 重新生成 API Key 失败:', error)
    return null
  }
}

async function testDeleteBot(botId: string) {
  console.log('\n8. 删除 Bot...')
  try {
    const response = await fetch(`${API_BASE}/api/bots/${botId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      console.log('✓ Bot 删除成功')
      return true
    } else {
      console.log('✗ 删除 Bot 失败')
      return false
    }
  } catch (error) {
    console.log('✗ 删除 Bot 失败:', error)
    return false
  }
}

async function runTests() {
  console.log('==========================================')
  console.log('Bot API 功能测试')
  console.log('==========================================')

  // 1. 创建用户
  const userId = await testCreateUser()

  // 2. 创建 Bot
  const bot = await testCreateBot(userId)
  if (!bot) {
    console.log('\n测试失败:无法创建 Bot')
    return
  }

  // 3. 获取 Bot 列表
  await testGetBots(userId)

  // 4. 获取 Bot 详情
  await testGetBot(bot.id)

  // 5. 更新 Bot
  await testUpdateBot(bot.id)

  // 6. 验证 API Key
  if (createdApiKey) {
    await testVerifyApiKey(createdApiKey)
  }

  // 7. 重新生成 API Key
  if (bot.id) {
    await testRegenerateApiKey(bot.id)
  }

  // 8. 删除 Bot (可选,取消注释以测试删除功能)
  // if (bot.id) {
  //   await testDeleteBot(bot.id)
  // }

  console.log('\n==========================================')
  console.log('测试完成!')
  console.log('==========================================')
  console.log('\n提示: 访问 http://localhost:3001/bots 查看管理界面')
}

// 运行测试
runTests().catch(console.error)
