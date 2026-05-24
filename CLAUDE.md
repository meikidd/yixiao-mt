@AGENTS.md

# CLAUDE.md — Yixiao 华语学习工具

## 项目概述

给新加坡小学四年级学生 Yixiao 的华语学习 Web App。核心功能：拍照录入文章、点击查词、自动建立词汇关联、复习提醒。

完整需求见 [PRD.md](./PRD.md)，技术架构见 [TECH_DESIGN.md](./TECH_DESIGN.md)。

---

## 技术栈快查

- **框架**：Next.js 14 App Router + TypeScript
- **样式**：Tailwind CSS + shadcn/ui
- **数据库**：Supabase (PostgreSQL + Storage)
- **AI**：Claude API (`claude-sonnet-4-6`) — OCR、字词查询、知识关联
- **图像预处理**：OpenCV.js（浏览器端透视矫正）
- **部署**：Vercel（`yixiao-mt.vercel.app`），通过 Cloudflare Worker 代理后对外暴露为 `meiyixiao.com/mt`

---

## 关键约定

### 用户系统
当前阶段**无登录界面**，使用硬编码单用户 ID（`NEXT_PUBLIC_DEFAULT_USER_ID`）。所有数据表含 `user_id` 字段，RLS 已开启，将来直接支持多用户。

### 中文语言
- 界面语言：简体中文
- 字词释义：**纯中文**，不加英文辅助（Yixiao 英文好，但这是华语学习工具）
- 拼音：新加坡 MOE 标准

### basePath 与 API 调用

本项目在 `next.config.ts` 中配置了 `basePath: '/mt'`，以便通过 `meiyixiao.com/mt` 访问。

**规则：客户端组件中所有 `fetch` 和 `useSWR` 调用 API 路由，必须使用 `basePath` 前缀：**

```ts
import { basePath } from '@/lib/base-path'

// ✅ 正确
fetch(`${basePath}/api/articles`)
useSWR(`${basePath}/api/vocabulary`, fetcher)

// ❌ 错误 — basePath 为 '/mt' 时会 404
fetch('/api/articles')
useSWR('/api/vocabulary', fetcher)
```

`lib/base-path.ts` 读取 `process.env.NEXT_PUBLIC_BASE_PATH`（值为 `/mt`）。服务端 API Route 文件（`route.ts`）不受影响，路径无需修改。

### AI 调用原则
- 字词释义查询结果**缓存到数据库**（`words` 表），同词不重复调用
- Claude Vision OCR 调用在 API Route（服务端），不在浏览器端暴露 API Key
- 知识关联计算**异步后台进行**，不阻塞用户操作

### 图像处理
- 优先 OpenCV.js 做透视矫正，失败则降级为直接发原图给 Claude Vision
- 原图和预处理图都存到 Supabase Storage
- 图像处理全自动，不要求用户手动调整

---

## 数据库核心表

| 表名 | 用途 |
|------|------|
| `users` | 用户（扩展用，当前只有 Yixiao） |
| `articles` | 学过的文章（正文 + 图片路径） |
| `words` | 字词库（全局共享，含拼音释义） |
| `user_words` | 用户-字词关系（状态 + 复习计划） |
| `article_words` | 文章-字词关联（含批注信息） |
| `word_relationships` | 知识关联图（近义词/反义词/同字词） |

详细 Schema 见 [TECH_DESIGN.md](./TECH_DESIGN.md#数据库-schema)。

---

## 复习算法

艾宾浩斯遗忘曲线间隔：1天、3天、7天、15天、30天。  
`user_words.next_review_at` 字段追踪下次复习时间。

---

## 环境变量（`.env.local`）

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEFAULT_USER_ID=
NEXT_PUBLIC_BASE_PATH=/mt          # Next.js basePath，客户端 API 调用需加此前缀
```
