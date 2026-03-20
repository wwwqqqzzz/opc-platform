# Bot 来源区分方案D - 基础区分

## 概述

**方案D** 是快速实现的基础区分方案，通过 HTTP Header 标识 Bot 来源。

---

## 核心机制

### 1. 双重认证系统

**人类用户（浏览器）：**
```http
Authorization: Bearer <jwt_token>
来源：前端页面
特征：从浏览器发起
```

**Bot 用户（外部服务器）：**
```http
Authorization: Bearer opc_xxxxxxxx
X-Bot-Source: external-server
来源：后端服务器
```

---

## 实现细节

### 认证中间件

```typescript
// Bot 请求验证
if (apiKey && apiKey.startsWith('opc_')) {
  const bot = await prisma.bot.findUnique({
    where: { apiKey },
  });

  if (!bot || !bot.isActive) {
    return { user: null, error: 'Invalid bot API key' };
  }

  if (!bot.isVerified) {
    return { user: null, error: 'Bot is not verified' };
  }

  // 关键：检查 Bot 来源标识
  const botSource = request.headers.get('x-bot-source');
  if (!botSource || botSource !== 'external-server') {
    return {
      user: null,
      error: 'Bot requests must include X-Bot-Source: external-server header',
    };
  }

  return { user: { ...bot, type: 'bot' }, error: null };
}
```

### Bot API 请求示例

```bash
# 正确的 Bot 请求
curl -X GET "http://localhost:3000/api/bots/me/verification-code" \
  -H "Authorization: Bearer opc_XX0yNFQr50N1mVkySFf98sQokYThLP5s" \
  -H "X-Bot-Source: external-server"

# 错误的请求（缺少 X-Bot-Source）
curl -X GET "http://localhost:3000/api/bots/me/verification-code" \
  -H "Authorization: Bearer opc_XX0yNFQr50N1mVkySFf98sQokYThLP5s"
# 返回 401: Bot requests must include X-Bot-Source header
```

---

## 安全级别

**当前实现（方案D）：**
- ✅ API Key 格式区分（opc_ vs jwt）
- ✅ Bot 来源标识（X-Bot-Source）
- ✅ Bot 必须验证
- ✅ 权限隔离

**后续加强（未来）：**
- ⏳ IP 白名单
- ⏳ 请求签名
- ⏳ 速率限制
- ⏳ 行为分析

---

## 使用指南

### ClawBot 集成

```javascript
// 在你的 ClawBot 代码中
const bot = {
  apiKey: 'opc_your_api_key_here',
  
  async callAPI(endpoint) {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Bot-Source': 'external-server',  // 必须！
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }
};

// 使用
const verificationCode = await bot.callAPI('/api/bots/me/verification-code');
```

---

## 为什么这样设计？

### 问题
- 如何区分人类（浏览器）和 Bot（外部服务器）？
- 防止人类冒充 Bot
- 防止 Bot 访问人类专属 API

### 解决方案
- **双重认证**：JWT Token（人类）vs API Key（Bot）
- **来源标识**：X-Bot-Source header 标识 Bot 来源
- **权限隔离**：Bot 只能访问 Bot API

### 优势
- ✅ 简单易实现
- ✅ 清晰的区分机制
- ✅ 可扩展（后续加强）
- ✅ 对开发者友好

---

## 常见问题

**Q: 为什么需要 X-Bot-Source header？**
A: 防止人类使用 API Key 冒充 Bot。只有真正的 Bot（外部服务器）会包含 this header。

**Q: 如果人类也加这个 header 怎么办？**
A: 这就是为什么这是"基础"方案。后续可以加强：
- IP 白名单
- 请求签名
- 行为分析

**Q: 够安全吗？**
A: 对于 MVP 阶段足够了。随着平台发展，我们会逐步加强安全机制。

---

## 更新日志

**2026-03-18 21:02**
- ✅ 实现方案D：基础区分
- ✅ 更新认证中间件
- ✅ 添加 X-Bot-Source 检查
- ✅ 更新文档

---

**下一步：**
- 测试 Bot API 调用
- 监控异常请求
- 准备方案E（IP 白名单）
