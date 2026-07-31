# bianra 小屋 v2 —— 详细设计文档

> 技术栈:Express 5 + Prisma + Vue 3(Vite)+ SQLite/Neon PostgreSQL
> 版本:v3(详细设计版)· 状态:已确认技术栈,待开工
> 替代旧仓库 `bianra/bianra.github.io`

---

## 目录

1. [项目概述](#1-项目概述)
2. [功能规格(细分)](#2-功能规格细分)
3. [数据模型(字段级)](#3-数据模型字段级)
4. [API 规格(接口级)](#4-api-规格接口级)
5. [前端设计(完整)](#5-前端设计完整)
6. [后端架构(完整)](#6-后端架构完整)
7. [实施计划(任务级)](#7-实施计划任务级)
8. [部署与运维](#8-部署与运维)
9. [验收清单](#9-验收清单)

---

## 1. 项目概述

### 1.1 目标

个人文章网站:全屏 "bianra" 大字封面 + 玻璃拟态双栏布局(左侧悬浮个人信息窗 + 中间文章流),带独立后台管理(发布/编辑文章 + 配图上传 + 个人资料维护)。

### 1.2 范围

| 包含 | 不包含 |
|---|---|
| 文章 CRUD + 封面配图 + 正文插图 | 留言板 / 点赞 |
| 后台轻量登录(单管理员) | 访客注册 / AI 对话 |
| 个人资料 / 公告 / 社交链接展示与编辑 | Live2D / 邮件通知 |
| 每日抽卡(纯前端) | 多用户 / 评论系统 |
| 文章 RSS | 在线编辑多人协作 |

### 1.3 交付物

- `site/backend` — Node 后端(Express + Prisma)
- `site/frontend` — Vue 3 前端(公开站 + 后台 SPA)
- `site/README.md` — 本地运行 / 部署文档

---

## 2. 功能规格(细分)

### 2.1 公开站功能

#### F1 个人资料展示
- **描述**:主页左侧悬浮窗展示头像、名字、一句话简介、公告栏、社交链接
- **数据来源**:`GET /api/profile`
- **交互**:点击社交链接新窗口打开;公告栏仅显示最近 1 条
- **边界**:profile 为空时隐藏对应区块,不显示空卡片

#### F2 文章列表(主页内容流)
- **描述**:中间区域分页展示文章卡片
- **卡片内容**:封面图(无封面则纯色占位 + 首字)、标题、摘要、发布日期、阅读时长(按字数估算)
- **分页**:每页 6 篇,底部"加载更多"按钮(滚动追加亦可)
- **数据来源**:`GET /api/articles?page&limit`
- **交互**:hover 上浮 + 阴影加深;滚动进入淡入上浮;点击卡片进入详情
- **边界**:无文章时显示空状态插画文案"还没有文章"

#### F3 文章详情
- **描述**:Markdown 正文渲染 + 封面大图
- **数据来源**:`GET /api/articles/:id`
- **交互**:标题、日期、正文;正文中 `![alt](url)` 图片自适应宽度圆角
- **边界**:文章不存在 → 404 页面;渲染使用 markdown-it(防 XSS:默认不渲染原始 HTML)

#### F4 归档页(`/archive`)
- **描述**:按年份分组的时间线,每项显示日期 + 标题
- **数据来源**:`GET /api/articles`(limit 取 100)
- **交互**:年份锚点 + 回到顶部按钮

#### F5 关于页(`/about`)
- **描述**:长文介绍页(名字、经历、兴趣爱好)
- **数据来源**:`GET /api/profile` 的 bio 字段
- **交互**:无特殊交互,纯展示

#### F6 每日抽卡(`/fortune`)
- **描述**:每日固定结果的"今日宜忌 + 幸运值"卡片
- **规则**:
  - 种子 = FNV-1a 哈希(`identity + "|" + 本地日期 + "|bianra-tea"`)
  - `identity` = localStorage 里的 `crypto.randomUUID()`(首次生成,永久保留)
  - PRNG = mulberry32;同一天结果恒定,次日自动变化
- **输出**:宜(1 条)、忌(1 条)、幸运色、吉时、茶语、幸运值(52–99)、吉凶档位(大吉/中吉/小吉/末吉)
- **数据**:12 宜 / 12 忌 / 8 幸运色 / 8 吉时 / 8 茶语,硬编码前端常量(内容偏"日常小事"风格,如"宜整理书桌 / 忌熬夜写码")
- **交互**:按钮"摇一摇" → 抖动动画 720ms → 卡片翻转 reveal;移动端支持 `devicemotion` 摇手机触发
- **边界**:无后端请求,离线可用;隐私文案"结果只在浏览器本地生成"

#### F7 文章 RSS
- **描述**:`GET /api/feed.xml` 输出最近 20 篇文章
- **格式**:RSS 2.0;每项:title / link(`https://bianra.com/post/<id>`)/ description(摘要)/ pubDate / guid

#### F8 深色/浅色主题
- **描述**:全站主题切换
- **交互**:右上角太阳/月亮按钮;切换写 CSS 变量 + localStorage 持久化
- **边界**:首次访问跟随系统 `prefers-color-scheme`

#### F9 响应式
- **断点**:≤1024px 双栏折叠为单栏(侧栏变顶部 profile 条);≤640px 字号/间距缩小
- **Hero**:移动端背景图仍全屏,大字字号用 `clamp()`

#### F10 内容保护(轻量)
- 禁用图片拖拽(公开图);复制文章正文时追加版权尾注"本文来自 bianra.com"

---

### 2.2 后台功能(独立 SPA,`/admin/`)

#### A1 轻量登录
- **流程**:输入用户名 + 密码 → `POST /admin/api/login` → 成功跳转仪表盘
- **会话**:cookie(7 天);前端每次请求带 `credentials: include`
- **状态**:进入 `/admin/*` 路由前 `GET /admin/api/check-auth` 校验,未登录重定向登录页
- **安全**:失败 5 次后延迟 5s;前端按钮 loading 防连点
- **边界**:已登录访问登录页 → 直接跳仪表盘

#### A2 仪表盘
- **内容**:文章总数卡片、最近 5 篇文章列表(标题 + 日期 + 编辑按钮)
- **数据来源**:`GET /admin/api/stats`

#### A3 文章管理(核心)
- **列表页**:
  - 表格:封面缩略图(60×40px)、标题、更新时间、操作(编辑/删除)
  - 顶部:搜索框(标题模糊)、新建按钮、批量删除(勾选后)
  - 分页:每页 10 条
- **新建/编辑页**:
  - 字段:标题(必填 ≤100 字)、封面图(上传控件)、摘要(≤200 字)、正文 Markdown
  - **编辑器**:双栏布局——左侧 textarea + 工具栏(加粗/斜体/标题/链接/图片/列表),右侧 markdown-it 实时预览;顶部"预览/编辑"可切换全屏
  - **图片上传**:工具栏"插入图片" → 选文件(校验 5MB + 类型)→ 上传 → 光标处插入 `![alt](url)`
  - **草稿**:每 30s 自动存 localStorage(`article_draft`);新建页若有草稿弹窗"恢复上次草稿?";发布成功后清除
  - **保存**:底部"保存"按钮(loading 防连点);编辑页另有"删除"
- **删除**:单条(confirm 弹窗)、批量(勾选 + confirm)

#### A4 图片上传
- 入口:文章编辑器"插入图片" + 设置页头像上传
- **校验**:前端查 5MB/类型;后端魔数双重校验
- **返回**:`{ url }`,前端直接使用

#### A5 设置
- **资料**:名字、简介(bio)、公告、头像(上传/清空)、社交链接(动态增删行:名称 + URL,最多 5 个)
- **改密码**:旧密码 + 新密码(≥6 位)+ 确认;成功提示并保持登录

#### A6 后台退出
- 右上角"退出登录" → `POST /admin/api/logout` → 回登录页

---

## 3. 数据模型(字段级)

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"          // 生产改 postgresql
  url      = env("DATABASE_URL")
}

model Admin {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}

model Profile {
  id           Int    @id @default(1)        // 单例,恒为 1
  name         String @default("bianra")
  bio          String @default("")           // 关于页长文
  announcement String @default("")           // 公告
  avatarUrl    String @default("")           // 头像 URL
  social       String @default("[]")         // JSON 数组 [{label:"GitHub",url:"..."}]
}

model Article {
  id        Int      @id @default(autoincrement())
  title     String   @db.VarChar(100)
  summary   String   @default("")            // 摘要,≤200 字
  content   String   @db.Text                // Markdown
  coverUrl  String   @default("")            // 封面图 URL
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([createdAt])
}
```

**说明**:
- `Profile.social` 用 JSON 字符串存储(简单,不建关联表)
- 列表接口不返回 `content`(性能),详情接口才返回
- 抽卡数据**不进数据库**(纯前端常量)

---

## 4. API 规格(接口级)

### 4.1 公开 API

#### GET `/api/profile`
```json
200 → { "name":"bianra", "bio":"...", "announcement":"...", "avatarUrl":"/uploads/.../a.png", "social":[{"label":"GitHub","url":"https://github.com/xxx"}] }
```

#### GET `/api/articles?page=1&limit=6`
```json
200 → { "items":[ { "id":1, "title":"...", "summary":"...", "coverUrl":"", "createdAt":"2026-07-31T08:00:00Z", "updatedAt":"..." } ], "total":12, "page":1, "pages":2 }
```

#### GET `/api/articles/:id`
```json
200 → { "id":1, "title":"...", "summary":"...", "content":"# Markdown...", "coverUrl":"...", "createdAt":"...", "updatedAt":"..." }
404 → { "error":"文章不存在" }
```

#### GET `/api/feed.xml`
```
200 text/xml → RSS 2.0(最近 20 篇,无文章时返回空 channel)
```

#### GET `/health`
```json
200 → { "status":"ok", "db":"connected" }
503 → { "status":"degraded", "db":"disconnected" }
```

#### GET `/robots.txt`
```
User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://bianra.com/sitemap.xml
```

### 4.2 后台 API(全部需登录,401 → `{ "error":"未登录" }`)

#### POST `/admin/api/login`
```json
req  { "username":"admin", "password":"***" }
200  { "ok":true }
401  { "error":"用户名或密码错误" }
```

#### POST `/admin/api/logout` → `200 { "ok":true }`

#### GET `/admin/api/check-auth` → `200 { "authenticated":true }` / `401`

#### GET `/admin/api/stats`
```json
200 → { "articleCount":12, "recent":[ { "id":1,"title":"...","updatedAt":"..." } ] }
```

#### GET `/admin/api/articles?q=&page=1&limit=10`
```json
200 → { "items":[ { "id":1,"title":"...","coverUrl":"","updatedAt":"..." } ], "total":12, "page":1, "pages":2 }
```

#### POST `/admin/api/articles`
```json
req  { "title":"...", "summary":"...", "content":"...", "coverUrl":"" }
201  → { "id":1, "title":"..." }
400  → { "error":"标题不能为空" }  // title 必填 ≤100;content ≤100KB
```

#### PUT `/admin/api/articles/:id`
```json
req  { "title":"...", "summary":"...", "content":"...", "coverUrl":"" }
200  → { "id":1, "title":"..." }
404  → { "error":"文章不存在" }
```

#### DELETE `/admin/api/articles/:id` → `200 { "ok":true }`

#### DELETE `/admin/api/articles`
```json
req  { "ids":[1,2,3] }  →  200 { "deleted":3 }
400  → { "error":"ids 必须是数组" }
```

#### POST `/admin/api/upload`(multipart/form-data,字段名 `file`)
```json
201 → { "url":"/uploads/202607/ab12cd34ef56.png" }
400 → { "error":"仅支持 png/jpg/jpeg/webp/gif,且 ≤5MB" }
```

#### GET `/admin/api/settings` → 同 `/api/profile` 结构
#### PUT `/admin/api/settings`
```json
req  { "name":"bianra", "bio":"...", "announcement":"...", "avatarUrl":"", "social":[...] }
200  → { "ok":true }
```

#### PUT `/admin/api/settings/password`
```json
req  { "oldPassword":"...", "newPassword":"......" }
200  → { "ok":true }   // 新密码 ≥6 位
400  → { "error":"旧密码错误" } / { "error":"新密码至少 6 位" }
```

---

## 5. 前端设计(完整)

### 5.1 设计令牌(design tokens)

```css
:root {
  /* 主色渐变(可在后台/代码调整) */
  --accent:   #7c6cf0;   /* 主紫 */
  --accent-2: #4aa8ff;   /* 副蓝 */
  --mint:     #34d399;   /* 点缀薄荷绿 */
  --accent-rgb: 124, 108, 240;  /* 供低透明度使用 */

  /* 中性色(浅色模式) */
  --ink:      #1f2430;   /* 正文 */
  --ink-2:    #5a6474;   /* 次要文字 */
  --panel:    rgba(255, 255, 255, 0.72);  /* 毛玻璃面板 */
  --bg:       #f4f6fb;   /* 页面底色 */

  --shadow:   0 8px 30px rgba(31, 36, 48, 0.08);
  --radius:   16px;
  --blur:     18px;
}
html.ks-dark {
  --ink:      #e8ecf4;
  --ink-2:    #9aa5b8;
  --panel:    rgba(24, 28, 38, 0.72);
  --bg:       #12151c;
  --shadow:   0 8px 30px rgba(0, 0, 0, 0.45);
}
```

- **渐变统一**:按钮/进度条/高亮 = `linear-gradient(135deg, var(--accent), var(--accent-2))`
- **玻璃拟态**:`background: var(--panel); backdrop-filter: blur(var(--blur)); border: 1px solid rgba(255,255,255,0.15); border-radius: var(--radius); box-shadow: var(--shadow);` + 左上角 8% 径向渐变光斑
- **字体**:标题 `LXGW WenKai`(CDN),正文 `MiSans` / `HarmonyOS Sans` / system-ui 栈
- **圆角/间距**:卡片 16px;区块间距 24/32px;内容流最大宽 720px

### 5.2 动效规范

| 动效 | 参数 |
|---|---|
| Hero 大字淡出 | `scrollY: 0→100vh`,`opacity 1→0`,`translateY 0→-40px`;背景 `scale 1→1.1`;rAF 节流 |
| 卡片进入 | IntersectionObserver(`threshold 0.15`),`opacity 0→1 + translateY 24px→0`,`300ms ease-out`,相邻卡片 `stagger 80ms` |
| 卡片 hover | `translateY(-4px)` + `box-shadow` 加深,`200ms ease` |
| 抽卡摇一摇 | 抖动 keyframes 720ms → 翻转 reveal 400ms |
| 页面过渡 | 路由切换 `fade + translateY(8px)`,`240ms` |

### 5.3 页面与组件树

```
App.vue
├── <RouterView>  (公开站)
│   ├── HomeView
│   │   ├── HeroSection          # 全屏封面:背景图 + "bianra" 大字 + slogan + ↓箭头
│   │   ├── MainGrid             # 双栏
│   │   │   ├── ProfileSidebar   # sticky 个人信息窗
│   │   │   │   ├── AvatarCard   # 头像 + 名字 + 简介
│   │   │   │   ├── Announcement # 公告栏
│   │   │   │   └── SocialLinks  # 社交链接图标
│   │   │   └── ArticleFeed      # 文章流
│   │   │       ├── ArticleCard  # 封面/标题/摘要/日期(循环)
│   │   │       └── LoadMoreBtn  # 加载更多/分页
│   │   └── SiteFooter
│   ├── ArchiveView              # 归档时间线
│   ├── AboutView                # 关于
│   ├── FortuneView              # 每日抽卡
│   ├── PostView                 # 文章详情(markdown-it 渲染)
│   └── NotFoundView             # 404
│
├── <RouterView>  (后台,父路由 /admin 套 AdminLayout)
│   ├── AdminLayout              # 左侧窄导航(仪表盘/文章/设置/退出)
│   │   ├── LoginView            # 登录页(未登录时)
│   │   ├── AdminDashboardView   # 仪表盘
│   │   ├── AdminArticlesView    # 文章列表(搜索/分页/批量删)
│   │   ├── AdminArticleEditView # 新建/编辑(编辑器 + 上传 + 草稿)
│   │   └── AdminSettingsView    # 设置(资料/改密码)
│
└── 全局组件
    ├── ThemeToggle              # 深色/浅色切换
    ├── ScrollProgressBar        # 顶部三色滚动进度条
    ├── Toast                    # 轻提示
    ├── ConfirmDialog            # 确认弹窗
    └── MdEditor                 # Markdown 编辑器(工具栏 + 预览 + 上传)
```

### 5.4 路由表

| 路径 | 组件 | 说明 |
|---|---|---|
| `/` | HomeView | 主页 |
| `/archive` | ArchiveView | 归档 |
| `/about` | AboutView | 关于 |
| `/fortune` | FortuneView | 抽卡 |
| `/post/:id` | PostView | 文章详情 |
| `/admin/login` | LoginView | 后台登录 |
| `/admin` | → redirect `/admin/dashboard` | 后台 |
| `/admin/dashboard` | AdminDashboardView | 仪表盘(守卫) |
| `/admin/articles` | AdminArticlesView | 文章列表(守卫) |
| `/admin/articles/new` | AdminArticleEditView | 新建(守卫) |
| `/admin/articles/:id/edit` | AdminArticleEditView | 编辑(守卫) |
| `/admin/settings` | AdminSettingsView | 设置(守卫) |
| `/:pathMatch(.*)*` | NotFoundView | 404 |

> 路由守卫:`router.beforeEach` → 访问 `/admin/*` 时若未登录(store 中无 session)跳 `/admin/login`。

### 5.5 状态管理(Pinia)

| store | state | actions |
|---|---|---|
| `useThemeStore` | `mode: 'light'\|'dark'`、`accent` | `toggle()`、`apply()`(写 CSS 变量 + localStorage) |
| `useAuthStore` | `authenticated: boolean`、`checking: boolean` | `checkAuth()`、`login()`、`logout()` |
| `useProfileStore` | `profile` | `fetchProfile()`、`update()` |
| `useArticleStore` | `list`、`total`、`page` | `fetchList()`、`fetchDetail()`、`create()`、`update()`、`remove()`、`batchRemove()` |
| `useFortuneStore` | `today`(今日结果) | `roll()`(确定性 PRNG 纯函数) |

### 5.6 API 封装(`src/api/index.js`)

```js
// 统一 fetch:baseURL 按环境(dev 代理 / prod 后端地址),credentials:'include'
// 15s 超时(AbortController);401 时触发 authStore 登出;错误统一 throw {error}
export const api = {
  get: (path, params) => ...,
  post: (path, body) => ...,
  put:  (path, body) => ...,
  del:  (path, body) => ...,
  upload: (path, file) => ...,   // FormData
}
```

### 5.7 每日抽卡纯函数(`src/utils/fortune.js`)

```js
export function fnv1a(str) { /* 32-bit FNV-1a */ }
export function mulberry32(seed) { /* 确定性 PRNG */ }
export function rollFortune(identity, dateStr) {
  const seed = fnv1a(`${identity}|${dateStr}|bianra-tea`)
  const rand = mulberry32(seed)
  // 从常量池抽 宜/忌/色/吉时/茶语;幸运值 = 52 + floor(rand()*48)
  // 五档:≥95 大吉 ≥85 中吉 ≥70 小吉 ≥60 吉 其余 末吉
  return { yi, ji, color, hour, tea, luck, level }
}
```

---

## 6. 后端架构(完整)

### 6.1 目录

```
backend/
├── src/
│   ├── server.js          # 入口:加载 env → createApp → listen
│   ├── app.js             # createApp():中间件 + 路由挂载 + 错误处理 + 静态目录
│   ├── config.js          # 环境变量校验(SESSION_SECRET 缺失抛错退出)
│   ├── db.js              # PrismaClient 单例
│   ├── middleware/
│   │   ├── requireAdmin.js# session.isAdmin 校验
│   │   └── upload.js      # multer 配置 + 魔数校验
│   ├── routes/
│   │   ├── public.js      # /api/profile /api/articles /api/feed.xml /health /robots.txt
│   │   └── admin.js       # /admin/api/login|logout|check-auth|stats|articles|upload|settings
│   └── services/
│       ├── articleService.js
│       ├── profileService.js
│       ├── authService.js
│       ├── rssService.js
│       └── fileService.js # 魔数校验 + uuid 落盘
├── prisma/
│   ├── schema.prisma
│   └── seed.js            # 建 Admin(admin/随机密码)+ Profile 单例
├── tests/                 # *.test.js(Vitest + supertest)
├── static/uploads/        # 上传文件(运行时生成,.gitignore)
├── .env.example
└── package.json
```

### 6.2 中间件链

```
helmet → cors(origin 白名单, credentials:true) → cookie-parser
→ express-session(connect-sqlite3 / connect-pg-simple)
→ morgan(dev) → express.json({limit:'1mb'})
→ /api 路由(公开) | /admin/api 路由(requireAdmin 保护,login 除外)
→ 404 处理 → errorHandler(生产隐藏堆栈)
```

### 6.3 关键实现要点

- **登录**:`bcrypt.compare` → 成功 `req.session.isAdmin=true`;失败计数(内存 Map,5 次后延迟 5s)
- **文章 CRUD**:Prisma 事务;删除单篇同时保留图片文件(不主动删文件,避免误删共享图)
- **上传**:内存接收 → 魔数校验(`fileType` 检测头字节)→ 转存 `static/uploads/yyyyMM/uuid.ext`
- **RSS**:手写 XML 字符串拼接(xml 转义标题/摘要);`res.type('application/xml')`
- **健康检查**:`prisma.$queryRaw\`SELECT 1\``,异常返回 503
- **静态托管**:`express.static('static')` 供 `/uploads/*` 与 `/robots.txt`

### 6.4 测试要点

- `tests/unit`:魔数校验(合法/伪造头)、rssService 输出、fortune 纯函数(同种子同结果)
- `tests/integration`:登录成功/失败、未登录 401、文章 CRUD 全流程、批量删除、上传拒绝 svg/超大、设置读写
- 测试库:独立 sqlite 文件(`:memory:` 或 tmp),每用例清表

---

## 7. 实施计划(任务级)

> 每阶段产出可运行、可验证;顺序执行,阶段间有验收点。

### 阶段 1:后端骨架(0.5 天)
- [ ] `backend/` 初始化:`npm init` + 安装依赖
- [ ] `prisma/schema.prisma` 三模型 + `prisma migrate dev --name init`
- [ ] `prisma/seed.js`(Admin 随机密码打印 + Profile 默认数据)
- [ ] `config.js` 环境校验、`db.js`、`server.js`、`app.js` 空壳
- [ ] `/health` + `/robots.txt`
- ✅ 验收:`npm run dev` 启动,`/health` 返回 ok,seed 日志显示初始密码

### 阶段 2:公开 API(0.5 天)
- [ ] `routes/public.js`:`/api/profile`、`/api/articles`(分页、不含 content)、`/api/articles/:id`
- [ ] `services/rssService.js` + `/api/feed.xml`
- [ ] tests:公开接口集成测试
- ✅ 验收:supertest 用例全绿

### 阶段 3:后台 API(0.5 天)
- [ ] `authService` + login/logout/check-auth + `requireAdmin` 中间件
- [ ] stats / articles CRUD + 批量删除
- [ ] `fileService` + multer 上传接口
- [ ] settings 读写 + 改密码
- [ ] tests:登录鉴权 + 后台全流程
- ✅ 验收:supertest 用例全绿(含 401 拒绝)

### 阶段 4:前端骨架(0.5 天)
- [ ] `frontend/` 初始化:`npm create vite`(vue)→ 装 vue-router/pinia/markdown-it
- [ ] 设计令牌 CSS + 玻璃拟态基础样式 + 深色模式
- [ ] 路由表 + 守卫骨架 + 三个 store(theme/auth/profile)空壳
- [ ] `api/` 封装 + vite dev 代理 `/api → localhost:3000`
- ✅ 验收:`npm run dev` 出页面,主题切换生效

### 阶段 5:公开站(1 天)
- [ ] HeroSection(大字淡出 + 视差 + slogan + 背景图)
- [ ] ProfileSidebar(sticky + 头像/简介/公告/社交)+ 响应式折叠
- [ ] ArticleFeed + ArticleCard(封面/摘要/分页/进入动画)
- [ ] PostView(markdown-it 渲染)
- [ ] ArchiveView / AboutView / NotFoundView
- [ ] FortuneView(抽卡纯函数 + 动画 + 摇一摇)
- [ ] ScrollProgressBar / Toast / Footer
- ✅ 验收:页面浏览 + 移动端尺寸正常;抽卡当日固定

### 阶段 6:后台 SPA(1 天)
- [ ] AdminLayout + 路由守卫 + LoginView
- [ ] AdminDashboardView
- [ ] AdminArticlesView(列表/搜索/分页/批量删除)
- [ ] MdEditor 组件(工具栏 + 预览 + 图片上传)+ AdminArticleEditView(含草稿)
- [ ] AdminSettingsView(资料 + 头像 + 社交 + 改密码)
- ✅ 验收:全流程走通——登录→发文(配图)→主页可见→编辑→删除

### 阶段 7:联调 + 收尾(0.5 天)
- [ ] 前后端联调全流程;深色模式;移动端检查
- [ ] README(本地运行 + 部署步骤 + 环境变量)
- [ ] 全量测试(backend vitest + frontend build 无错)
- ✅ 验收:本地从 0 按 README 跑通;测试全绿

### 阶段 8:推送覆盖上线(视网络)
- [ ] 网络恢复后:`git push -f` 覆盖 `bianra/bianra.github.io`
- [ ] Render + Neon 配置环境变量;GitHub Pages 部署 dist
- ✅ 验收:线上访问正常

**总工时:约 4.5 个开发日(AI 辅助,含联调)**

---

## 8. 部署与运维

| 组件 | 平台 | 配置 |
|---|---|---|
| 前端 | GitHub Pages | `frontend/dist/` → 仓库,CNAME `bianra.com` |
| 后端 | Render Web Service | 启动 `npm start`(gunicorn 类比:node server.js 或 pm2);env 见 §6 |
| 数据库 | Neon | `DATABASE_URL`;Render 首次启动自动 `prisma migrate deploy` |
| 域名 | Cloudflare | bianra.com → GitHub Pages;CNAME `bianra-backend.onrender.com`(或子域) |
| 监控 | UptimeRobot | GET `/health`,5 分钟间隔 |

**生产环境变量**:`DATABASE_URL`(Neon PG)、`SESSION_SECRET`(强随机)、`ADMIN_PASSWORD`(可选)、`CORS_ORIGIN`(https://bianra.com)

**备份策略**:Neon 自动备份;文章图片在 Render 磁盘(注意免费实例重启会清盘 → 建议配图走 Neon 静态资源或对象存储,或接受重启后图片丢失的权衡;首版接受本地磁盘,文档标注风险)

---

## 9. 验收清单

- [ ] 主页:Hero 大字滚动淡出;双栏布局;文章卡片悬浮动效;深色模式
- [ ] 文章:发布(含封面/正文插图)→ 主页列表可见 → 详情渲染正常
- [ ] 后台:未登录访问被拦截;登录/登出;文章增删改查 + 批量删 + 搜索分页
- [ ] 上传:合法图片成功;SVG/超 5MB/伪造扩展名被拒
- [ ] 抽卡:当日固定、次日变化;摇一摇动画
- [ ] RSS:订阅源可被阅读器解析
- [ ] 安全:默认密码不硬编码;SESSION_SECRET 缺失拒绝启动;错误不泄露堆栈
- [ ] 响应式:1024px / 640px 断点正常
