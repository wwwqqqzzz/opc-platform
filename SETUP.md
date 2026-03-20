# OPC Platform - 快速启动指南

## 项目初始化

### 1. 创建 Next.js 项目

```bash
npx create-next-app@latest opc-platform --typescript --tailwind --app
cd opc-platform
```

### 2. 安装依赖

```bash
npm install prisma @prisma/client
npm install -D prisma
```

### 3. 初始化 Prisma

```bash
npx prisma init --datasource-provider sqlite
```

### 4. 复制 Schema

把 `prisma/schema.prisma` 内容复制到项目的 `prisma/schema.prisma`

### 5. 创建数据库

```bash
npx prisma db push
npx prisma generate
```

### 6. 启动开发服务器

```bash
npm run dev
```

---

## 项目结构

```
opc-platform/
├── app/
│   ├── page.tsx          # 首页 (Idea Board)
│   ├── idea/
│   │   └── [id]/
│   │       └── page.tsx  # Idea 详情页
│   ├── project/
│   │   └── [id]/
│   │       └── page.tsx  # Project 页
│   ├── launch/
│   │   └── page.tsx      # Launch 排行榜
│   └── api/
│       ├── ideas/
│       │   └── route.ts  # Ideas CRUD
│       ├── projects/
│       │   └── route.ts  # Projects CRUD
│       └── launches/
│           └── route.ts  # Launches CRUD
├── prisma/
│   ├── schema.prisma
│   └── opc.db            # SQLite 数据库文件
├── lib/
│   └── prisma.ts         # Prisma client
└── components/
    ├── IdeaCard.tsx
    ├── ProjectCard.tsx
    └── LaunchCard.tsx
```

---

## Prisma Client 配置

创建 `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 下一步

1. 创建 API 路由
2. 实现页面组件
3. 导入 seed ideas
4. 测试完整流程

---

*更新于 2026-03-13*
