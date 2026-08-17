# bianra 小屋 v2

个人网站 + 自托管知识库系统。前端展示文章/关于页,后台管理内容,并内置「知识 Agent」——把工作记录自动整理成可检索的知识笔记(上传 → AI 生成 → 人工审核 → 入库 → 合并 → 知识树)。

> **快速上手**:见下文 [五分钟了解](#五分钟了解) 与 [本地开发](#本地开发)。

---

## 五分钟了解

### 这是什么

- **前台**(任何人可见):首页文章流(分类/标签筛选)、文章详情(Markdown 渲染)、关于页、侧栏公告/头像/社交、RSS(`/feed.xml`)、每日一签
- **后台**(`/admin`,需登录):仪表盘、文章增删改、上传图片、个人资料设置、改密码
- **知识 Agent**(后台「知识 Agent」页):对接一个独立的 Python 知识 Agent,实现
  `上传记录 → AI 生成笔记草稿 → 你审核(提意见/通过/驳回)→ 入库 → 笔记合并 → 知识树生成 → 检索问答`

### 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js 20 + **Express 5** + **Prisma 6** + PostgreSQL(16) |
| 前端 | **Vue 3** + Vite + Pinia + Vue Router;编辑器 TipTap,渲染 markdown-it + DOMPurify + highlight.js |
| 鉴权 | express-session + bcryptjs(单管理员) |
| 知识 Agent(可选) | 独立 Python 服务(见 `memos-knowledge-system/`),REST API 由后台代理 |

### 当前生产架构(2026-08)

```
阿里云 ECS(2核2G, 公网)
├─ Caddy(自动 HTTPS)
│    ├─ bianra.com ───────► 本仓库网站(:3000)
│    ├─ memos.bianra.com ─► Memos 随手记(:5230)
│    └─ api.bianra.com ───► 知识 Agent API(:8787, 令牌鉴权)
├─ 本仓库(Express + 前端 dist + 本地 PostgreSQL 16, pm2 托管)
└─ memos-knowledge-system(知识 Agent + Memos, 同机)
```

- 生产服务由 **pm2** 托管(`bianra` / `knowledge-agent` / `memos`),开机自启
- `render.yaml` 为早期 Render 部署蓝图,**当前生产已迁移到阿里云,仅保留参考**
- 备案号:陕ICP备2026020676号(已挂页面底部)

### 目录结构

```
my_site/
├── site/
│   ├── backend/            # Express 后端
│   │   ├── prisma/         # 数据模型 + 迁移 + seed
│   │   ├── src/
│   │   │   ├── app.js      # Express 装配(session/helmet/静态托管/路由)
│   │   │   ├── config.js   # 环境变量集中读取与校验
│   │   │   ├── db.js       # Prisma 客户端
│   │   │   ├── server.js   # 入口
│   │   │   ├── middleware/ # requireAdmin / upload
│   │   │   ├── routes/     # public.js(前台 API)+ admin.js(后台 API + 知识 Agent 代理)
│   │   │   └── services/   # article/auth/file/profile/rss 业务逻辑
│   │   └── static/dist/    # 前端构建产物(生产由 Express 托管, 同源部署)
│   └── frontend/           # Vue 3 前端
│       ├── public/         # PWA: manifest.webmanifest / sw.js / icons
│       └── src/
│           ├── views/      # 前台: Home/Post/Fortune/NotFound;后台: admin/
│           ├── components/ # MdEditor/ProfileCard/TopNavbar 等
│           ├── api/        # 统一请求封装
│           ├── stores/     # auth/profile/theme
│           └── router/
├── render.yaml             # (历史) Render 蓝图, 生产已不用
└── README.md
```

---

## 功能清单

### 前台
- 文章列表:按分类(`study` 学习 / `code` 代码 / `chat` 闲谈)、标签云、关键词搜索
- 文章详情:Markdown 渲染(GFM/代码高亮/表格)、阅读进度条
- 关于页(个人简介长文)、侧栏(头像/社交/公告/每日一签)
- RSS:`/feed.xml`;`robots.txt`;PWA(可"添加到主屏幕")

### 后台(`/admin`)
- 仪表盘:文章数/分类统计
- 文章管理:新建/编辑/删除(支持封面、标签、摘要;正文 Markdown 编辑器)
- 图片上传:存 PostgreSQL(`Upload` 表 BYTEA),`/uploads/:id` 读取
- 设置:个人资料(名称/简介/头像/背景图/艺术字/社交)、改密码

### 知识 Agent 页(`/admin/agent`)
- **上传记录 → 生成笔记**:粘贴一段工作记录,知识 Agent(DeepSeek)整理成结构化笔记草稿
- **对话问答**:对知识库提问,返回答案 + 引用来源
- **草稿审核台**:查看 AI 草稿 → 提修改意见(AI 按意见改,过程可见)/ 通过 / 驳回 / 入库
- **已入库笔记**:勾选 2+ 篇 → 合并成新笔记;勾选 → 生成知识树
- 后端通过 `/admin/api/agent/*` 代理到同机知识 Agent(`127.0.0.1:8787`,带 `AGENT_AUTH_TOKEN`)

---

## 数据模型(Prisma)

| 模型 | 说明 | 关键字段 |
|---|---|---|
| `Admin` | 单管理员 | `username`(唯一)、`passwordHash`(bcrypt) |
| `Profile` | 个人资料(单例 id=1) | `name/bio/announcement/avatarUrl/bgUrl/artFont/social(JSON 字符串)` |
| `Article` | 文章 | `title/summary/content(Markdown)/category/tags(JSON 字符串)` |
| `Upload` | 上传文件 | `mime/data(BYTEA)` |

索引:`Article` 的 `createdAt`、`category`。

---

## API 一览

### 公开(`/api/public` 前缀, 无需登录)
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/profile` | 个人资料 |
| GET | `/category-counts` | 各分类文章数 |
| GET | `/tag-cloud` | 标签云 |
| GET | `/articles?category=&tag=&q=&page=` | 文章列表(分页/筛选/搜索) |
| GET | `/articles/:id` | 文章详情 |
| GET | `/feed.xml` | RSS |

### 后台(`/admin/api`, 需登录)
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/login` `/logout` · GET `/check-auth` | 认证 |
| GET | `/stats` | 仪表盘统计 |
| GET/POST | `/articles` · PUT/DELETE `/articles/:id` | 文章 CRUD |
| POST | `/upload` | 图片上传(存 DB) |
| GET/PUT | `/settings` · PUT `/settings/password` | 设置/改密码 |
| GET | `/agent/drafts` `/agent/draft/:id` `/agent/notes` | 知识 Agent:草稿/笔记列表 |
| GET | `/agent/ask?query=` | 知识 Agent:检索问答 |
| POST | `/agent/summarize` `/merge` `/tree` | 生成草稿/合并/建树 |
| POST | `/agent/feedback` `/approve` `/reject` `/publish` | 审核动作 |

> 知识 Agent 代理:`/admin/api/agent/*` → `AGENT_BASE_URL`(默认 `http://127.0.0.1:8787/v1`),带 `AGENT_AUTH_TOKEN` 转发;同机部署无跨域问题。

---

## 环境变量(backend)

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 连接串 |
| `SESSION_SECRET` | ✅ | 会话密钥,缺失拒绝启动 |
| `PORT` | | 默认 3000 |
| `NODE_ENV` | | `production` 时托管前端 dist、开启安全头 |
| `CORS_ORIGIN` | | 默认 `http://localhost:5173` |
| `ADMIN_PASSWORD` | | seed 时指定初始管理员密码(空 = 随机生成并打印) |
| `SITE_URL` | | RSS/robots 用,默认 `https://bianra.com` |
| `COOKIE_SECURE` | | 生产默认 true(HTTPS);本地 HTTP 调试设 `false` |
| `AGENT_BASE_URL` / `AGENT_AUTH_TOKEN` | | 知识 Agent 代理地址/令牌 |

---

## 本地开发

### 前置
- Node.js ≥ 20、PostgreSQL(≥ 13;推荐 16)

### 步骤
```bash
# 1. 数据库
createdb bianra   # 或自建库
cd site/backend
cp .env.example .env
# 编辑 .env: DATABASE_URL / SESSION_SECRET(必填)

# 2. 后端
npm ci
npx prisma migrate deploy   # 建表
npx prisma db seed          # 创建管理员(见控制台输出)
npm run dev                 # http://localhost:3000

# 3. 前端(另开终端)
cd ../frontend
npm ci
npm run dev                 # http://localhost:5173(Vite 代理 /api → :3000)
```

> 生产同源部署:前端 `npm run build` 产物放 `backend/static/dist`,Express 直接托管。

### 测试
```bash
cd site/backend && npm test   # vitest(文章/认证/文件服务等)
```
> 测试需要 `.env` 中的 `DATABASE_URL`(Neon 或本机 PostgreSQL);测试自动追加 `?schema=test`
> 隔离到独立 schema,**不会清除开发数据**。生产会话已持久化到同一数据库的 `session` 表
> (connect-pg-simple, 重启/部署不丢登录态)。

---

## 知识 Agent(memos-knowledge-system)

知识沉淀能力由独立的 `memos-knowledge-system/`(工作区同级目录)提供:
- Python 3.11 零依赖服务(`knowledge-agent/server.py --watch`),默认 `:8787`
- 令牌鉴权(`AGENT_AUTH_TOKEN`),草稿状态机,DeepSeek 等 LLM 插件化
- 数据权威源在本地 `knowledge/`(drafts/notes/trees/trash)
- 详见该目录的 `README.md` / `AGENT.md` / `AGENTS.md`

**本仓库与其的关系**:后台「知识 Agent」页只是它的一个 Web 前端(代理调用);两者通常部署在同一台服务器。

---

## 安全说明

- 会话:express-session(MemoryStore,重启即失效;生产建议换 `connect-pg-simple`)
- 密码:bcrypt;管理员单账号
- 上传:文件存数据库(避免磁盘不持久),MIME 校验
- 知识 Agent API 暴露公网时**必须**配置 `AGENT_AUTH_TOKEN`(无令牌 401)
- 生产环境敏感值(密码/令牌)在服务器 `.env`,**不要提交 git**

## License

MIT(见 LICENSE)
