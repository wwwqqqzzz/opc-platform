# OPC Platform - 防刷机制实现文档

## 概述
本文档说明了 OPC Platform 中实现的防刷机制，用于防止用户和Bot刷票、刷评论等作弊行为。

## 实现的功能

### 1. 数据库模型更新

#### Upvote 模型更新 (prisma/schema.prisma:90-104)
```prisma
model Upvote {
  id        String   @id @default(uuid())
  ideaId    String   @map("idea_id")
  userId    String   @map("user_id") // IP or session
  ipAddress String?  @map("ip_address") // Client IP address for anti-spam
  userAgent String?  @map("user_agent") // Client user agent for bot detection
  createdAt DateTime @default(now()) @map("created_at")

  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)

  @@unique([ideaId, userId])
  @@index([ipAddress])
  @@index([createdAt])
  @@map("upvotes")
}
```

**新增字段：**
- `ipAddress`: 记录客户端IP地址，用于基于IP的防刷
- `userAgent`: 记录客户端User-Agent，用于Bot检测
- 新增索引：`ipAddress` 和 `createdAt`，用于快速查询

#### Comment 模型更新 (prisma/schema.prisma:76-91)
```prisma
model Comment {
  id          String   @id @default(uuid())
  ideaId      String   @map("idea_id")
  authorType  String   @map("author_type")
  authorName  String?  @map("author_name")
  content     String
  ipAddress   String?  @map("ip_address") // Client IP address for anti-spam
  userAgent   String?  @map("user_agent") // Client user agent for bot detection
  createdAt   DateTime @default(now()) @map("created_at")

  idea        Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)

  @@index([ipAddress])
  @@index([createdAt])
  @@map("comments")
}
```

**新增字段：**
- `ipAddress`: 记录客户端IP地址，用于基于IP的防刷
- `userAgent`: 记录客户端User-Agent，用于Bot检测
- 新增索引：`ipAddress` 和 `createdAt`，用于快速查询

### 2. 防刷中间件 (src/lib/rate-limit.ts)

实现了完整的防刷中间件，包含以下功能：

#### 2.1 速率限制 (Rate Limiting)
```typescript
const RATE_LIMITS = {
  upvote: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1分钟内最多10次点赞
  },
  comment: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1分钟内最多5条评论
  },
  general: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1分钟内最多20次请求
  },
}
```

**实现方式：**
- 使用内存存储 (Map) 记录每个标识符的请求次数
- 基于IP + User-Agent的组合生成唯一标识符
- 自动清理过期记录（每5分钟清理一次）

#### 2.2 Bot检测
```typescript
export function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /go-http/, /node/, /axios/, /fetch/,
  ]
  return botPatterns.some((pattern) => pattern.test(userAgent))
}
```

**检测的特征：**
- 常见的Bot关键词（bot, crawler, spider等）
- 命令行工具（curl, wget）
- 编程语言客户端（python, java, node, axios等）

#### 2.3 IP重复检测

**点赞重复检测：**
```typescript
export async function checkDuplicateUpvote(
  ideaId: string,
  ipAddress: string
): Promise<{ isDuplicate: boolean; count: number }>
```
- 检查同一IP在24小时内是否已对该idea点赞
- 返回是否重复和重复次数

**评论重复检测：**
```typescript
export async function checkDuplicateComment(
  ideaId: string,
  ipAddress: string,
  content: string
): Promise<{ isDuplicate: boolean; count: number }>
```
- 检查同一IP在1小时内是否发布过相同内容的评论
- 防止复制粘贴相同的垃圾评论

#### 2.4 客户端标识提取
```typescript
export function getClientIdentifier(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `${ip}-${userAgent}`
}
```

### 3. API接口更新

#### 3.1 点赞接口 (src/app/api/upvote/route.ts)

**新增的防刷检查：**
1. **Bot检测** - 检测到Bot直接返回403错误
2. **速率限制** - 1分钟内最多10次点赞请求
3. **IP重复检查** - 24小时内同一IP只能点赞一次
4. **记录追踪** - 记录IP地址和User-Agent

```typescript
// Bot检测
if (isBot(userAgent)) {
  return NextResponse.json({ error: 'Bot activity detected' }, { status: 403 })
}

// 速率限制
const rateLimitCheck = await checkRateLimit(request, 'upvote')
if (!rateLimitCheck.allowed) {
  return NextResponse.json({ error: rateLimitCheck.error }, { status: 429 })
}

// IP重复检查
const duplicateCheck = await checkDuplicateUpvote(ideaId, ipAddress)
if (duplicateCheck.isDuplicate) {
  return NextResponse.json(
    { error: 'You have already upvoted this idea recently' },
    { status: 429 }
  )
}
```

#### 3.2 评论接口 (src/app/api/ideas/[id]/comments/route.ts)

**新增的防刷检查：**
1. **Bot检测** - 检测到Bot直接返回403错误
2. **速率限制** - 1分钟内最多5条评论
3. **内容重复检查** - 1小时内同一IP不能发布相同内容
4. **记录追踪** - 记录IP地址和User-Agent

```typescript
// Bot检测
if (isBot(userAgent)) {
  return NextResponse.json({ error: 'Bot activity detected' }, { status: 403 })
}

// 速率限制
const rateLimitCheck = await checkRateLimit(request, 'comment')
if (!rateLimitCheck.allowed) {
  return NextResponse.json({ error: rateLimitCheck.error }, { status: 429 })
}

// 内容重复检查
const duplicateCheck = await checkDuplicateComment(id, ipAddress, content.trim())
if (duplicateCheck.isDuplicate) {
  return NextResponse.json(
    { error: 'You have already posted this comment recently' },
    { status: 429 }
  )
}
```

## 防刷机制总结

### 多层防护
1. **第一层：Bot检测**
   - 基于User-Agent识别已知的Bot和爬虫
   - 直接拒绝Bot请求

2. **第二层：速率限制**
   - 限制单个客户端的请求频率
   - 防止快速连续请求

3. **第三层：IP重复检测**
   - 点赞：24小时内同一IP只能点赞一次
   - 评论：1小时内同一IP不能发布相同内容

4. **第四层：用户ID限制**
   - 保留原有的userId唯一性约束
   - 双重保护（IP + userId）

### 数据追踪
- 所有点赞和评论都记录IP地址和User-Agent
- 可用于后续分析和审计
- 支持识别异常行为模式

### 错误响应
- `403 Forbidden`: Bot活动被检测到
- `429 Too Many Requests`: 超过速率限制或重复操作

## 部署说明

### 1. 数据库迁移
```bash
# 方式1：使用 Prisma Migrate（推荐用于开发环境）
npx prisma migrate dev --name add_anti_spam_fields

# 方式2：直接推送Schema更改（推荐用于生产环境）
npx prisma db push

# 生成Prisma Client
npx prisma generate
```

### 2. 环境变量
确保 `.env` 文件中配置了数据库连接：
```env
DATABASE_URL="file:./prisma/opc.db"
```

### 3. 生产环境注意事项

**IP地址获取：**
- 确保反向代理（如Nginx）正确设置 `X-Forwarded-For` 头
- 或配置 `X-Real-IP` 头

**Redis集成（可选）：**
- 当前使用内存存储速率限制数据
- 对于生产环境，建议使用Redis进行分布式速率限制
- 可以修改 `RateLimiter` 类使用Redis作为后端

**监控和告警：**
- 建议添加日志记录被拒绝的请求
- 可以设置告警监控异常高的拒绝率

## 扩展建议

### 1. 验证码集成
对于高风险操作，可以添加验证码：
- Google reCAPTCHA
- hCaptcha
- Cloudflare Turnstile

### 2. 用户认证
实现完整的用户系统后：
- 基于用户ID的限制更准确
- 可以增加信誉评分系统
- 检测用户行为模式

### 3. 机器学习检测
- 使用ML模型识别异常行为模式
- 分析点赞和评论的时间分布
- 识别协同作弊行为

### 4. 黑名单机制
- 自动封禁异常IP地址
- 管理员可以手动添加黑名单
- 支持临时封禁和永久封禁

## 测试建议

### 1. 单元测试
```typescript
// 测试Bot检测
expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
expect(isBot('curl/7.68.0')).toBe(true)
expect(isBot('Mozilla/5.0 (Windows NT 10.0)')).toBe(false)

// 测试速率限制
const check1 = await checkRateLimit(request, 'upvote')
expect(check1.allowed).toBe(true)

const check2 = await checkRateLimit(request, 'upvote')
// ... 测试超过限制的情况
```

### 2. 集成测试
- 测试完整的点赞流程
- 测试完整的评论流程
- 测试各种拒绝场景

### 3. 压力测试
- 使用工具模拟大量请求
- 验证速率限制是否生效
- 确保系统稳定性

## 维护和监控

### 1. 日志分析
定期检查被拒绝的请求：
- 按IP统计拒绝次数
- 识别高频违规IP
- 分析Bot特征变化

### 2. 性能优化
- 监控数据库查询性能
- 确保索引有效
- 定期清理旧数据

### 3. 规则调整
- 根据实际情况调整速率限制参数
- 更新Bot检测规则
- 优化重复检测时间窗口

## 结论

本防刷机制通过多层防护有效防止了：
- ✅ Bot自动化刷票
- ✅ 快速连续请求
- ✅ IP地址重复投票
- ✅ 复制粘贴垃圾评论
- ✅ 编程脚本批量操作

系统设计兼顾了安全性和用户体验，为OPC Platform提供了坚实的防作弊基础。
