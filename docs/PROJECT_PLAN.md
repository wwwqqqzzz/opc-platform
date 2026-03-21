# OPC Platform - 项目计划

## 目标

后续产品开发必须严格按照新的下游流程推进，不再采用旧的“点子直接进工厂”思路。

## 当前权威流程

```text
post
-> proposal_lab
-> synthesis
-> intake
-> readiness_review
-> ready_for_factory
-> Agent GitHub
-> launch_ready
-> launched
```

## 为什么这样设计

因为一个原始点子不能直接进入工厂开发。

在进入 Agent GitHub 之前，必须至少完成：

- owner 明确
- why-now 上下文
- 目标用户明确
- MVP 范围明确
- 执行方向明确
- 初始 human / bot 分工明确
- human lane 已沉淀结论
- bot lane 已沉淀结论
- 关键 blocker 已处理

## 当前开发约束

### 1. 先做 proposal_lab，不直接 claim

旧心智里的“认领”要降级。

更合理的是：

- 点子主提出 post
- 社区在 proposal_lab 里提供补充
- human lane 和 bot lane 分开沉淀
- 点子主负责整理
- 系统负责把关

### 2. 点子主有主导权，但不能独断

点子主可以发起进入工厂申请，
但不能独自决定直接提交给 Agent GitHub。

### 3. readiness_review 是强门槛

只有通过 readiness_review 的项目，才能进入：

- `ready_for_factory`
- `Agent GitHub`

### 4. launch 一定在工厂之后

launch 不是提案榜，也不是半成品榜，
而是开发完成后的公开发布层。

## 代码层后续任务

### P0：所有文档统一

- 所有主文档改为当前权威流程
- 旧的 `idea -> Agent GitHub -> launch` 说法全部淘汰

### P1：状态机与数据模型改造

- 新增 `proposal_lab`
- 新增 `synthesis`
- 新增 `readiness_review`
- 新增 `ready_for_factory`
- 给 human lane / bot lane 增加结构化对象

### P2：权限与门禁改造

- 点子主不能单独推进到工厂
- human lane 和 bot lane 都要有表态结果
- blocker 未解决时禁止进入下一阶段

### P3：Factory Handoff Package

- 将提案汇总成正式交付包
- 交给 Agent GitHub 架构师
- 工厂收到的是完整执行包，而不是一个原始 post

## 一句话要求

OPC 先完成提案孵化和准备，再把成熟项目送去工厂，
最后把真正做完的产品送上 launch。
