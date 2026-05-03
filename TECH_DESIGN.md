# 技术设计文档 (TECH_DESIGN)

## 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 前端框架 | Next.js 14 (App Router) + TypeScript | 移动端优先 Web App，同时支持桌面；内置 API Routes 处理 AI 调用 |
| 样式 | Tailwind CSS + shadcn/ui | 快速开发，组件成熟，支持中文字体 |
| 数据库 / 存储 | Supabase（PostgreSQL + Storage） | 云同步 + 文件存储 + 未来多用户 RLS 隔离 |
| AI 引擎 | Claude API (claude-sonnet-4-6) | OCR + 字词解析 + 知识关联用同一个 API |
| 图像预处理 | OpenCV.js（浏览器端）+ Claude Vision | OpenCV 做透视矫正，Claude 做 OCR 和语义理解 |
| 全局状态 | Zustand | 字词卡片、上传进度等跨组件状态 |
| 部署 | Vercel | Next.js 最佳拍档，自动 HTTPS，全球 CDN |
| 字体 | Noto Sans SC | 覆盖所有简体汉字，免费 |

---

## 数据库 Schema

```sql
-- 用户表（多用户扩展基础，当前只有一个用户）
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  display_name text NOT NULL,
  grade text,  -- 'P4', 'P5' 等
  created_at timestamptz DEFAULT now()
);

-- 文章表
CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,           -- OCR 提取后的正文
  raw_image_urls text[],           -- Supabase Storage 路径
  source text DEFAULT 'photo',     -- 'photo' | 'manual' | 'builtin'
  date_read date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 字词库（全局，所有用户共享基础数据）
CREATE TABLE words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hanzi text UNIQUE NOT NULL,      -- 词/字，如"柔软"
  pinyin text NOT NULL,
  part_of_speech text,             -- '名词' | '动词' | '形容词' 等
  definition text NOT NULL,
  example_sentences jsonb,         -- [{"sentence": "...", "source": "..."}]
  usage_notes text,
  hsk_level int,
  created_at timestamptz DEFAULT now()
);

-- 用户-字词学习状态
CREATE TABLE user_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  word_id uuid REFERENCES words(id) ON DELETE CASCADE,
  status text DEFAULT 'new',       -- 'new' | 'learning' | 'reviewing' | 'mastered'
  first_seen_at timestamptz DEFAULT now(),
  last_reviewed_at timestamptz,
  next_review_at timestamptz,      -- 艾宾浩斯下次复习时间
  review_count int DEFAULT 0,
  notes text,
  UNIQUE(user_id, word_id)
);

-- 文章-字词关联
CREATE TABLE article_words (
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  word_id uuid REFERENCES words(id) ON DELETE CASCADE,
  context_sentence text,           -- 词在文章中出现的原句
  is_annotated bool DEFAULT false, -- 是否被用户在原图中划线/圈出
  annotation_type text,            -- 'underline' | 'circle' | 'note'
  annotation_note text,            -- 手写旁批内容（如果有）
  PRIMARY KEY (article_id, word_id)
);

-- 知识关联图谱
CREATE TABLE word_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_a_id uuid REFERENCES words(id) ON DELETE CASCADE,
  word_b_id uuid REFERENCES words(id) ON DELETE CASCADE,
  relation_type text NOT NULL,     -- 'antonym' | 'synonym' | 'same_char' | 'related'
  explanation text,
  auto_generated bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(word_a_id, word_b_id, relation_type)
);
```

**Row Level Security（RLS）**：所有含 `user_id` 的表开启 RLS，只能读取自己的数据。  
当前阶段用硬编码单用户 ID，无需登录界面，但 RLS 策略已就位，将来直接开放注册即可。

---

## 图像处理流程

```
手机拍照（或从相册选图）
  │
  ▼ [浏览器端 OpenCV.js]
  ├─ 1. 边缘检测，寻找纸张轮廓（findContours）
  ├─ 2. 4点透视变换，纠正倾斜（getPerspectiveTransform）
  ├─ 3. 自动裁剪到纸张边界
  └─ 4. CLAHE 对比度增强（处理曝光不足）
  │
  ├─ [降级] 如检测不到纸张轮廓 → 直接发原图给 Claude Vision
  │
  ▼ [上传到 Supabase Storage]
  原图 + 预处理图都保存
  │
  ▼ [Next.js API Route → Claude Vision API]
  System Prompt 指令：
    - 分析版面类型（单栏/双栏/跨页）
    - 提取正文，忽略页眉页脚和装饰元素
    - 识别用户批注：
        * 下划线/圈出的词 → annotated_words[]
        * 手写旁批 → annotations[{near_text, note}]
    - 返回结构化 JSON
  │
  ▼ [存入数据库]
  articles 表 + article_words 表（批注词自动入库）
```

### Claude Vision API Prompt 模板

```
你是一个专业的中文文章识别助手。请分析这张书页图片，返回以下 JSON 格式的数据：

{
  "title": "文章标题（如果能识别）",
  "layout": "single_column | double_column | two_pages | partial",
  "content": "文章正文全文，保留原始段落结构",
  "annotated_words": [
    {"text": "被划线或圈出的词", "type": "underline | circle"}
  ],
  "handwritten_notes": [
    {"near_text": "手写旁批附近的印刷文字", "note": "手写内容"}
  ]
}

注意：
- 如果是双栏排版，先读左栏再读右栏
- 如果拍了两页，分别提取每页内容，用 "---" 分隔
- 忽略页码、页眉、装饰图案
- 如有用铅笔/钢笔划线的文字，将其列入 annotated_words
```

---

## API 设计

### 图像处理
`POST /api/upload` — 接收图片，运行 Claude Vision，返回结构化文章数据

### 字词查询
`POST /api/words/lookup` — 查询字词，先查数据库缓存，未命中则调用 Claude API

### 知识关联
`POST /api/words/relate` — 给定新词和用户已学词库，返回关联关系（后台异步调用）

### 文章
`GET /api/articles` — 文章列表（分页）  
`GET /api/articles/[id]` — 文章详情（含高亮词）  
`POST /api/articles` — 保存文章

### 复习
`GET /api/review/due` — 今日待复习词列表  
`POST /api/review/[wordId]` — 提交复习结果，更新 next_review_at

---

## 字词查询 Claude Prompt 模板

```
你是新加坡小学华语教师助手。请用小学生能理解的语言解释以下词语，返回 JSON 格式：

词语：{hanzi}

返回格式：
{
  "pinyin": "拼音（按新加坡 MOE 标准）",
  "part_of_speech": "词性",
  "definition": "释义（50字以内，小学生能懂的语言）",
  "example_sentences": [
    {"sentence": "例句1", "translation": null},
    {"sentence": "例句2", "translation": null}
  ],
  "usage_notes": "用法说明，常见搭配（如果有）",
  "related_suggestions": ["相关词1", "相关词2", "相关词3"]
}

该词语在文章中的上下文：{context}
```

---

## 知识关联 Claude Prompt 模板

```
以下是一个小学生最近学过的华语词汇列表（JSON 格式）：
{learned_words_json}

新学词语：{new_word}

请找出新词与已学词汇之间的关联，返回 JSON 格式：
[
  {
    "word": "已学词",
    "relation_type": "antonym | synonym | same_char | related",
    "explanation": "一句话说明关联"
  }
]

只返回有实际语义关联的词，没有关联就返回空数组。
```

---

## 艾宾浩斯复习间隔算法

```typescript
const REVIEW_INTERVALS = [1, 3, 7, 15, 30]; // 天数

function getNextReviewDate(reviewCount: number): Date {
  const days = REVIEW_INTERVALS[Math.min(reviewCount, REVIEW_INTERVALS.length - 1)];
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
}
```

---

## 项目目录结构

```
app/
  layout.tsx                  根布局（字体、全局样式）
  (app)/
    layout.tsx                应用壳（导航）
    dashboard/page.tsx        今日概览 + 复习提醒
    articles/
      page.tsx                文章时间线列表
      [id]/page.tsx           文章阅读（含点词查询）
    upload/page.tsx           拍照录入
    vocabulary/page.tsx       词汇表
    review/page.tsx           闪卡复习
    word/[id]/page.tsx        字词详情 + 关联词
  api/
    upload/route.ts           图像处理 API
    words/
      lookup/route.ts         字词查询
      relate/route.ts         知识关联
    articles/route.ts
    review/
      due/route.ts
      [wordId]/route.ts

components/
  image-processor/
    useOpenCV.ts              OpenCV.js 封装 hook
    ImageUploader.tsx         拍照/上传组件
    ProcessingPreview.tsx     处理预览
  word-card/
    WordCard.tsx              字词卡片（弹出层）
    RelatedWords.tsx          关联词列表
  article-viewer/
    ArticleText.tsx           可点击的文章正文
    AnnotationHighlight.tsx   批注高亮
  flashcard/
    FlashCard.tsx             复习闪卡
    ReviewSession.tsx         复习会话管理
  ui/                         shadcn/ui 组件

lib/
  claude/
    client.ts                 Anthropic SDK 封装
    prompts.ts                所有 Prompt 模板
    ocr.ts                    OCR 调用
    lookup.ts                 字词查询调用
    relate.ts                 知识关联调用
  supabase/
    client.ts                 浏览器端 client
    server.ts                 服务端 client
    types.ts                  数据库类型定义
  opencv/
    processor.ts              图像预处理工具函数
  utils/
    review.ts                 艾宾浩斯算法

supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
    003_seed_user.sql         初始化单用户

store/
  wordCard.ts                 字词卡片弹出状态
  upload.ts                   上传进度状态
```

---

## 环境变量

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEFAULT_USER_ID=    # 当前阶段硬编码的单用户 ID
```
