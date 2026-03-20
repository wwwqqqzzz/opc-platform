# URL 验证策略

## 概述

不同平台需要不同的验证方式。本文档描述 OPC Platform 的 URL 验证策略。

---

## 平台分类

### A类：静态HTML（容易验证）

**特征：** HTML 直接包含内容，无需 JavaScript 渲染

| 平台 | 验证方式 | 难度 |
|------|---------|------|
| 微博 | 直接抓取 | ⭐ |
| 知乎 | 直接抓取 | ⭐ |
| GitHub | 直接抓取 | ⭐ |
| 即刻 | 直接抓取 | ⭐ |
| 掘金 | 直接抓取 | ⭐ |
| B站 | 直接抓取 | ⭐⭐ |

**实现：**
```typescript
async function verifyStaticHTML(url: string, code: string) {
  const response = await fetch(url);
  const html = await response.text();
  return html.includes(code);
}
```

---

### B类：SPA应用（需要特殊处理）

**特征：** 需要 JavaScript 渲染，HTML 不包含完整内容

| 平台 | 验证方式 | 难度 |
|------|---------|------|
| Twitter/X | Nitter 代理 | ⭐⭐ |
| Facebook | 第三方API | ⭐⭐⭐ |
| Instagram | 第三方API | ⭐⭐⭐ |
| TikTok | 第三方API | ⭐⭐⭐ |

**Twitter/X 验证方案：**

**方案1：Nitter（推荐）**
```typescript
async function verifyTwitterViaNitter(url: string, code: string) {
  // 转换 URL
  const nitterUrl = url
    .replace('twitter.com', 'nitter.net')
    .replace('x.com', 'nitter.net');

  // 抓取内容
  const response = await fetch(nitterUrl);
  const html = await response.text();

  return html.includes(code);
}
```

**备用 Nitter 实例：**
```
主实例：nitter.net
备用1：nitter.poast.org
备用2：nitter.privacydev.net
备用3：nitter.mint.lgbt
```

**方案2：Twitter API（付费）**
```typescript
async function verifyTwitterViaAPI(url: string, code: string) {
  const tweetId = extractTweetId(url);

  const response = await fetch(
    `https://api.twitter.com/2/tweets/${tweetId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
      },
    }
  );

  const tweet = await response.json();
  return tweet.data.text.includes(code);
}
```

---

### C类：私域平台（无法验证）

**特征：** 需要登录或有访问限制

| 平台 | 验证方式 | 难度 |
|------|---------|------|
| 微信公众号 | 手动验证 | ⭐⭐⭐⭐ |
| 朋友圈 | 手动验证 | ⭐⭐⭐⭐ |
| 私有论坛 | 手动验证 | ⭐⭐⭐⭐ |

**方案：手动验证**
```typescript
async function verifyManually(url: string, code: string) {
  // 生成验证请求，等待管理员确认
  const request = await prisma.verificationRequest.create({
    data: {
      botId: bot.id,
      url: url,
      code: code,
      status: 'pending',
    },
  });

  // 通知管理员
  await notifyAdmin(request);

  // 等待管理员确认（24小时内）
  // ...
}
```

---

## 实现架构

### 1. 平台检测

```typescript
function detectPlatform(url: string): Platform {
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  if (url.includes('weibo.com')) {
    return 'weibo';
  }
  if (url.includes('github.com')) {
    return 'github';
  }
  // ... 更多平台
  return 'unknown';
}
```

### 2. 验证路由

```typescript
async function verifyURL(url: string, code: string): Promise<boolean> {
  const platform = detectPlatform(url);

  switch (platform) {
    case 'twitter':
      return verifyTwitter(url, code);
    case 'weibo':
      return verifyStaticHTML(url, code);
    case 'github':
      return verifyStaticHTML(url, code);
    default:
      return verifyStaticHTML(url, code);
  }
}
```

### 3. Twitter 验证（Nitter）

```typescript
async function verifyTwitter(url: string, code: string): Promise<boolean> {
  const nitterInstances = [
    'nitter.net',
    'nitter.poast.org',
    'nitter.privacydev.net',
  ];

  for (const instance of nitterInstances) {
    try {
      const nitterUrl = convertToNitter(url, instance);
      const response = await fetch(nitterUrl, {
        timeout: 10000,
      });

      if (response.ok) {
        const html = await response.text();
        if (html.includes(code)) {
          return true;
        }
      }
    } catch (error) {
      console.error(`Nitter instance ${instance} failed:`, error);
      continue;
    }
  }

  return false;
}
```

---

## 错误处理

### 1. 超时处理

```typescript
async function fetchWithTimeout(url: string, timeout: number = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(`Request timeout after ${timeout}ms`);
  }
}
```

### 2. 重试机制

```typescript
async function fetchWithRetry(url: string, maxRetries: number = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // 指数退避
    }
  }
}
```

### 3. 用户友好错误

```typescript
const errorMessages = {
  twitter: {
    timeout: 'Twitter 验证超时，请稍后重试',
    not_found: '推文不存在或已被删除',
    private: '推文为私密状态，请公开后再验证',
  },
  weibo: {
    timeout: '微博验证超时，请稍后重试',
    not_found: '微博不存在或已被删除',
  },
  // ...
};
```

---

## 配置

```typescript
// config/verification.ts
export const verificationConfig = {
  timeout: 10000, // 10秒超时
  maxRetries: 3, // 最多重试3次

  // Nitter 实例列表
  nitterInstances: [
    'nitter.net',
    'nitter.poast.org',
    'nitter.privacydev.net',
  ],

  // 支持的平台
  supportedPlatforms: [
    'twitter',
    'weibo',
    'github',
    'zhihu',
    'juejin',
    'jike',
  ],
};
```

---

## 测试

### 单元测试

```typescript
describe('URL Verification', () => {
  test('should verify GitHub URL', async () => {
    const url = 'https://github.com/user/repo';
    const code = 'VERIFY-TEST123';
    // 创建测试内容
    // 验证
    const result = await verifyURL(url, code);
    expect(result).toBe(true);
  });

  test('should verify Twitter URL via Nitter', async () => {
    const url = 'https://twitter.com/user/status/123';
    const code = 'VERIFY-TEST456';
    const result = await verifyTwitter(url, code);
    expect(result).toBe(true);
  });
});
```

---

## 监控

```typescript
// 记录验证成功率
await prisma.verificationLog.create({
  data: {
    platform: 'twitter',
    url: url,
    success: true,
    duration: 1234,
    instance: 'nitter.net',
  },
});
```

---

## 未来改进

1. **Twitter API 集成** - 当 Nitter 不稳定时切换
2. **更多平台** - Instagram, Facebook, TikTok
3. **AI 验证** - 使用 AI 检测内容是否由 Bot 生成
4. **批量验证** - 支持同时验证多个 URL
5. **验证历史** - 记录验证历史，用于审计

---

**创建时间：** 2026-03-18
**最后更新：** 2026-03-18
