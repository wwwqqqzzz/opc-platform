# Bot API 文档

OPC Platform Bot 管理系统 API 文档

## 数据模型

### User
```typescript
interface User {
  id: string
  email: string
  name: string | null
  createdAt: string
  updatedAt: string
}
```

### Bot
```typescript
interface Bot {
  id: string
  name: string
  description: string | null
  apiKey: string
  ownerId: string
  config: string | null  // JSON string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}
```

## API 端点

### 1. 创建用户
**POST** `/api/users`

创建新用户。

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**响应:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### 2. 获取用户列表
**GET** `/api/users`

获取所有用户列表(仅用于开发调试)。

### 3. 创建 Bot
**POST** `/api/bots`

创建新的 Bot。

**请求体:**
```json
{
  "name": "My Bot",
  "description": "Bot description",
  "userId": "user-id",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7
  }
}
```

**响应:**
```json
{
  "id": "bot-id",
  "name": "My Bot",
  "description": "Bot description",
  "apiKey": "opc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "ownerId": "user-id",
  "config": "{\"model\":\"gpt-4\",\"temperature\":0.7}",
  "isActive": true,
  "lastUsedAt": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### 4. 获取用户的 Bot 列表
**GET** `/api/bots?userId=<user-id>`

获取指定用户的所有 Bot。

### 5. 获取单个 Bot 详情
**GET** `/api/bots/<bot-id>`

获取指定 Bot 的详细信息。

### 6. 更新 Bot
**PUT** `/api/bots/<bot-id>`

更新 Bot 信息。

**请求体:**
```json
{
  "name": "Updated Bot Name",
  "description": "Updated description",
  "config": {
    "model": "gpt-4-turbo"
  },
  "isActive": false
}
```

所有字段都是可选的。

### 7. 删除 Bot
**DELETE** `/api/bots/<bot-id>`

删除指定的 Bot。

### 8. 验证 API Key
**POST** `/api/bots/verify`

验证 API Key 是否有效并更新最后使用时间。

**请求头:**
```
Authorization: Bearer <api-key>
```
或
```
X-API-Key: <api-key>
```

**响应:**
```json
{
  "valid": true,
  "bot": {
    "id": "bot-id",
    "name": "My Bot",
    "description": "Bot description",
    "config": "{\"model\":\"gpt-4\"}",
    "isActive": true,
    "lastUsedAt": "2025-01-01T00:00:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "owner": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

### 9. 重新生成 API Key
**POST** `/api/bots/<bot-id>/regenerate-key`

为 Bot 重新生成新的 API Key(旧 Key 将失效)。

**响应:**
```json
{
  "message": "API Key regenerated successfully",
  "bot": {
    "id": "bot-id",
    "name": "My Bot",
    "apiKey": "opc_newapikeyxxxxxxxxxxxxxxxxxxxxxx",
    ...
  }
}
```

## 使用示例

### 创建并使用 Bot

```javascript
// 1. 创建用户
const userResponse = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'Test User'
  })
})
const user = await userResponse.json()

// 2. 创建 Bot
const botResponse = await fetch('http://localhost:3000/api/bots', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My AI Assistant',
    description: 'Helpful assistant bot',
    userId: user.id
  })
})
const bot = await botResponse.json()
console.log('API Key:', bot.apiKey)

// 3. 使用 API Key 调用其他 API
const dataResponse = await fetch('http://localhost:3000/api/data', {
  headers: {
    'Authorization': `Bearer ${bot.apiKey}`
  }
})
```

### 在 API 路由中验证 API Key

```typescript
// pages/api/protected.ts
import { extractApiKeyFromHeader } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 提取 API Key
  const authHeader = req.headers.authorization
  const apiKey = extractApiKeyFromHeader(authHeader)

  if (!apiKey) {
    return res.status(401).json({ error: 'API Key required' })
  }

  // 验证 API Key
  const bot = await prisma.bot.findUnique({
    where: { apiKey },
    include: { owner: true }
  })

  if (!bot || !bot.isActive) {
    return res.status(401).json({ error: 'Invalid API Key' })
  }

  // 更新最后使用时间
  await prisma.bot.update({
    where: { id: bot.id },
    data: { lastUsedAt: new Date() }
  })

  // 处理请求
  res.status(200).json({ message: 'Success', bot: bot.name })
}
```

## 前端管理界面

访问 `/bots` 路由可以使用 Bot 管理界面,提供以下功能:

- 查看所有 Bot
- 创建新 Bot
- 编辑 Bot 信息
- 删除 Bot
- 激活/停用 Bot
- 查看/复制 API Key
- 重新生成 API Key

## API Key 格式

API Key 格式: `opc_<32个随机字符>`

示例: `opc_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6`

## 安全建议

1. **生产环境**: 对用户密码使用 bcrypt 等库进行哈希处理
2. **HTTPS**: 生产环境必须使用 HTTPS 传输 API Key
3. **API Key 权限**: 考虑实现不同级别的 API Key 权限
4. **速率限制**: 实现基于 Bot 或用户的 API 速率限制
5. **日志记录**: 记录所有 API Key 的使用情况用于审计
6. **Key 轮换**: 定期提醒用户轮换 API Key

## 测试

运行测试脚本:

```bash
npm run dev  # 在另一个终端启动开发服务器
npx tsx scripts/test-bot-api.ts
```

测试脚本会执行以下操作:
1. 创建测试用户
2. 创建测试 Bot
3. 获取 Bot 列表
4. 获取 Bot 详情
5. 更新 Bot
6. 验证 API Key
7. 重新生成 API Key
