# bianra 小屋 v2

个人文章网站:全屏 "bianra" 大字封面 + 玻璃拟态双栏布局(左侧悬浮个人信息窗 + 中间文章流),带独立后台管理(发布/编辑文章 + 配图上传 + 个人资料维护)。

- 技术栈:Express 5 + Prisma 6 + Vue 3 + Vite(全 Node)
- 数据库:PostgreSQL(Neon,本地与生产一致)
- 部署:单服务同源(Express 托管前端 dist,方案 X)

## 目录结构

```
my_site/
├── site/
│   ├── backend/     # Express 后端 (src/ + prisma/ + tests/)
│   └── frontend/    # Vue 3 前端 (公开站 + 后台 SPA)
├── render.yaml      # Render Blueprint 部署配置
├── PROJECT_PLAN.md  # 项目设计文档
├── FIX_PLAN.md      # 修复方案
└── PROGRESS_REPORT.md
```

## 本地开发

### 前置要求

- Node.js 18+ (推荐 20/22)
- 一个 Neon 免费库(https://neon.tech),拿到 PostgreSQL 连接串

### 1. 后端

```bash
cd site/backend
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env, 填入:
#   DATABASE_URL = 你的 Neon 连接串
#   SESSION_SECRET = 一段随机长串
#   ADMIN_PASSWORD = (可选) 初始管理员密码

# 初始化数据库 (建表 + 初始管理员 + Profile 单例)
npx prisma migrate dev
npm run prisma:seed

# 启动后端 (http://localhost:3000)
npm run dev
```

### 2. 前端

```bash
cd site/frontend
npm install
npm run dev   # http://localhost:5173 (Vite 代理 /api → localhost:3000)
```

浏览器访问 http://localhost:5173(公开站),http://localhost:5173/admin(后台)。

### 3. 测试

```bash
cd site/backend
npm test      # 51 个用例 (连接 Neon 的独立 test schema, 不污染开发数据)
```

## 部署(Render + Neon,方案 X 同源)

1. **Neon**:创建项目,复制连接串
2. **Render**:Dashboard → New → Blueprint → 选择本仓库(或 Web Service, rootDir 指向 `site/backend`)
3. 配置环境变量:
   - `DATABASE_URL` = Neon 连接串
   - `SESSION_SECRET` = 随机长串
   - `CORS_ORIGIN` = `https://bianra.com`(同源部署实际无跨域,可留默认)
   - `SITE_URL` = `https://bianra.com`
   - `ADMIN_PASSWORD` = 可选,初始管理员密码
4. 构建命令(render.yaml 已配置):`npm ci && npx prisma migrate deploy && npx prisma db seed`
5. 启动命令:`npm start`(Procfile)
6. 首次部署后,控制台会打印初始管理员密码(若未设 ADMIN_PASSWORD)

### 前端构建

```bash
cd site/frontend
npm run build    # 产物 frontend/dist
```

生产模式(`NODE_ENV=production`)下后端会自动托管 `frontend/dist` 并提供 SPA history fallback。

### 自定义域名

Render 服务绑定域名后,在 DNS(Cloudflare)加 CNAME 指向 Render 分配的地址即可。

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev`(backend) | 后端开发模式(自动重启) |
| `npm run dev`(frontend) | 前端 Vite dev server |
| `npm test`(backend) | 运行全部测试 |
| `npm run prisma:migrate` | 生成并应用迁移 |
| `npm run prisma:seed` | 初始化管理员 + Profile |
| `npm run prisma:studio` | Prisma Studio 可视化数据库 |
| `npm run build`(frontend) | 构建前端产物 |

## 功能

- 公开站:bianra 大字封面(滚动淡出)、文章流(分类/搜索/分页)、文章详情(Markdown)、每日抽卡、关于页、RSS
- 后台:登录、仪表盘、文章管理(封面/摘要/分类/正文 + 图片上传 + 草稿)、设置(资料/头像/背景图/社交/改密码)
- 固定深色模式;玻璃拟态设计令牌(tokens.css)
