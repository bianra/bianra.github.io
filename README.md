# bianra 小屋 v2

个人文章网站:全屏 "bianra" 艺术字封面 + 玻璃拟态双栏布局(左侧悬浮信息窗 + 中间文章流),带独立后台管理系统。

**线上地址**:https://bianra.com(自动跳转 www.bianra.com)

---

## 一、技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 后端框架 | **Express 5**(Node.js) | 工厂模式 + 中间件链 |
| ORM / 数据库 | **Prisma 6** + **Neon PostgreSQL 17**(免费) | 全 PG 方案,本地与生产一致 |
| 前端 | **Vue 3.5** + **Vite 8** + **Vue Router 5** + **Pinia 4** | 单页应用,SPA |
| Markdown | **markdown-it 15**(`html: false` 防 XSS) | 文章渲染 |
| 认证 | **express-session + bcryptjs** | 单管理员,HttpOnly Cookie |
| 图片上传 | **multer + file-type + image-size** | 魔数校验 + 像素上限(8000px)+ 5MB 限制 |
| 安全 | **helmet + cors** + 参数化查询 + URL 白名单 | 输入校验、生产隐藏堆栈 |
| 测试 | **Vitest + supertest**(59 用例) | 单元 + 集成 |
| 部署 | **Render**(免费实例)+ Neon + 阿里云 DNS | 单服务同源部署 |

---

## 二、架构

```
浏览器 (bianra.com / www.bianra.com)
        │
        ▼
┌────────────────────────────────────────────────┐
│      Render 免费实例 (单服务, 同源部署)           │
│      https://bianra-site.onrender.com           │
│  ┌──────────────────────────────────────────┐  │
│  │  Express 5 后端                           │  │
│  │   ├─ 公开 API  (/api/*)                  │  │
│  │   ├─ 后台 API  (/admin/api/*)            │  │
│  │   ├─ 静态托管: 前端 dist (SPA)            │  │
│  │   └─ 上传图片读取 (/uploads/:id, 存DB)    │  │
│  └──────────────────────────────────────────┘  │
└──────────────────┬─────────────────────────────┘
                   ▼
        ┌────────────────────────┐
        │  Neon PostgreSQL 17     │
        │  文章 / 资料 / 图片二进制 │
        └────────────────────────┘
```

**核心设计**:前端构建产物 `frontend/dist` 由 Express 直接托管(方案 X),前后端同源,无跨域问题、cookie 天然同源;上传图片存数据库,绕开 Render 免费实例磁盘不持久的问题。

---

## 三、功能

### 公开站
- **封页 Hero**:全屏 "bianra" 艺术字(滚动淡出)+ 打字机副标 + 每日一言
- **文章流**:分类筛选(学习/代码/闲谈)+ 标签筛选 + 标题/摘要/正文搜索 + 分页加载更多
- **文章详情**:Markdown 渲染、标签、正文插图
- **每日抽签**:纯前端确定性 PRNG,当日固定可分享
- **字体库**:15 款本地托管字体,封页艺术字可自由切换
- **RSS**:`/api/feed.xml` 订阅

### 后台(`/admin`)
- 登录 / 登出 / 改密码
- 仪表盘(文章总数 + 最近文章)
- 文章管理:新建/编辑(双栏编辑器 + 插图上传 + 草稿自动保存)、分类/标签、搜索分页、批量删除
- 设置:资料(头像/简介/公告)、背景图、**封页字体选择**、社交链接、改密码

---

## 四、数据模型

| 表 | 字段 | 说明 |
|---|---|---|
| `Admin` | username, passwordHash | 单管理员 |
| `Profile` | name, bio, announcement, avatarUrl, bgUrl, **artFont**, social | 单例(id=1) |
| `Article` | title, summary, content, coverUrl, category, **tags**(JSON), createdAt, updatedAt | 分类: study/code/chat |
| `Upload` | mime, data(BYTEA) | 上传图片二进制 |

---

## 五、API 概览

### 公开(`/api`)
| Method | Path | 说明 |
|---|---|---|
| GET | `/profile` | 个人资料 |
| GET | `/articles?page&limit&cat&tag&q` | 文章列表(分类/标签/全站搜索) |
| GET | `/articles/:id` | 文章详情 |
| GET | `/category-counts` | 各分类文章数 |
| GET | `/tag-cloud` | 标签云统计 |
| GET | `/feed.xml` | RSS |
| GET | `/uploads/:id` | 上传图片(数据库读取) |
| GET | `/health` | 健康检查(监控用) |

### 后台(`/admin/api`,需登录)
login / logout / check-auth / stats / articles(CRUD+批量删) / upload / settings(含 artFont)/ settings/password

---

## 六、本地开发

### 前置
- Node.js 18+(推荐 20/22)
- 一个 Neon 免费库(https://neon.tech),拿 PostgreSQL 连接串

### 后端
```bash
cd site/backend
npm install
cp .env.example .env
# 编辑 .env: DATABASE_URL=你的Neon连接串, SESSION_SECRET=随机长串, ADMIN_PASSWORD=初始密码(可选)
npx prisma migrate dev   # 建表
npm run prisma:seed      # 初始管理员 + Profile
npm run dev              # http://localhost:3000
```

### 前端
```bash
cd site/frontend
npm install
npm run dev              # http://localhost:5173 (代理 /api → :3000)
```

访问 `http://localhost:5173`(公开站)、`/admin`(后台,默认账号 bianra + seed 密码)。

### 测试
```bash
cd site/backend
npm test                 # 59 用例(连接 Neon 独立 test schema)
```

---

## 七、部署(Render + Neon)

1. **Neon**:创建项目,复制连接串
2. **Render**:New → Blueprint → 选仓库(读取 `render.yaml`,rootDir=`site/backend`,plan=free)
3. 填环境变量:
   - `DATABASE_URL` = Neon 连接串
   - `SESSION_SECRET` = 随机长串
   - `ADMIN_PASSWORD` = 初始管理员密码
   - `CORS_ORIGIN` = `https://bianra.com`
   - `SITE_URL` = `https://bianra.com`
4. 构建(buildCommand):`npm ci` → `prisma migrate deploy` → `prisma db seed` → 前端 `npm run build` → dist 复制到 `backend/static/dist`
5. 启动:`npm start`(Procfile)
6. **域名**:阿里云 DNS `www` → CNAME `bianra-site.onrender.com`,`@` → A 记录 Render IP;Render 添加自定义域名自动签发 HTTPS

> 重新部署:Render → Manual Deploy → Deploy latest commit(免费实例磁盘不持久,但图片存数据库不受影响)。

---

## 八、目录结构

```
my_site/
├── site/
│   ├── backend/                  # Express 后端
│   │   ├── src/
│   │   │   ├── server.js/app.js/config.js/db.js
│   │   │   ├── routes/           # public.js(公开) + admin.js(后台+登录)
│   │   │   ├── services/         # article/profile/auth/file/rss
│   │   │   └── middleware/       # requireAdmin + upload
│   │   ├── prisma/               # schema + migrations + seed
│   │   ├── tests/                # 59 用例 (Vitest + supertest)
│   │   └── static/               # robots.txt + 运行时 dist
│   └── frontend/                 # Vue 3 前端
│       ├── src/
│       │   ├── views/            # 公开页 + admin/(后台 6 页)
│       │   ├── components/       # ProfileCard/TopNavbar/FortuneCard/Toast/ConfirmDialog
│       │   ├── stores/           # Pinia (profile/theme)
│       │   ├── router/           # 路由 + 守卫
│       │   ├── api/              # fetch 封装
│       │   ├── utils/            # fortune/quotes/date
│       │   ├── styles/           # tokens.css 设计令牌
│       │   └── assets/fonts/     # 15 款本地字体
│       └── index.html
├── render.yaml                   # Render Blueprint 部署配置
├── README.md                     # 本文档
└── DEV_DIARY.md                  # 开发日记(从零到上线)
```

---

## 九、常用命令

| 命令(backend 目录) | 说明 |
|---|---|
| `npm run dev` | 后端开发(自动重启) |
| `npm start` | 生产启动 |
| `npm test` | 全部测试 |
| `npm run prisma:migrate` | 生成并应用迁移 |
| `npm run prisma:seed` | 初始化管理员 + Profile |
| `npm run prisma:studio` | 可视化数据库 |

| 命令(frontend 目录) | 说明 |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | 构建前端产物 |

---

## 十、注意事项

- **免费实例冷启动**:Render 免费实例约 15 分钟无流量休眠,首次访问需等几秒唤醒(建议 UptimeRobot 定时 ping `/health` 保活)
- **生产密码**:上线务必用强密码(别用本地 `bianra123`)
- **图片存储**:图片存数据库(Neon 免费档 0.5GB),大量传图注意空间
- **备份**:Neon 自动备份保留 7 天;重要内容建议定期导出
