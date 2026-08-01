# my_site 修复方案(FIX PLAN)

> 目标:在不改动公开站前端设计的前提下,完成安全修复、后台界面视觉统一、垃圾清理、测试与部署就绪。
> 关联文档:PROJECT_PLAN.md(v3 设计)、PROGRESS_REPORT.md(进度)

---

## 0. 范围界定

### ✅ 本次做
| 类别 | 内容 |
|---|---|
| 安全修复 | seed 密码、probe.mjs 凭据、session 加固、输入校验、URL 协议校验 |
| 前端功能调整 | 移除归档页、移除深色切换按钮、首页数据真实性修复 |
| 后台视觉统一 | 后台 6 个视图全部改用公开站设计令牌(玻璃拟态、tokens.css) |
| 垃圾清理 | 死代码组件、死 CSS、临时脚本、dist 堆积、探针文章 |
| 测试补充 | category / bgUrl / 上传边界用例 |
| 部署就绪 | migration 重建、部署配置、README |

### ❌ 本次不做
- 公开站视觉/布局/动效**一律不动**(Hero、侧栏、文章流、抽卡样式保持现状)
- 不新增功能(不加评论/留言/多用户等)
- 不改变公开站现有路由结构(只删归档,不加新页面)

---

## 1. 安全修复(后端)

### 1.1 seed.js 密码硬编码 → 环境变量/随机生成 【严重】
- **现状**:`prisma/seed.js:10-12` 硬编码 `bianra/bianra123`,`ADMIN_PASSWORD` 从未被读取;`config.js:26` 声明了但没消费
- **修复**:
  - seed.js 读 `process.env.ADMIN_PASSWORD`,为空则 `crypto.randomBytes(6).toString('hex')` 生成并 `console.log` 打印一次
  - 去掉"每次 seed 重置密码"的 `deleteMany` 逻辑 → 改为:已存在 Admin 则跳过,不存在才创建
  - 更新 `.env.example` 注释明确行为

### 1.2 probe.mjs 删除 【严重】
- `probe.mjs:15` 含真实凭据 `bianra/bianra123`,与 check.mjs 一起删除

### 1.3 登录会话加固 【中】
- `admin.js` 登录成功:`req.session.regenerate()` 后再写 `isAdmin`
- 生产 session 存储:接 `connect-pg-simple`(生产用 PG 存会话,重启不掉线、防爆破计数不重置);开发保留 MemoryStore

### 1.4 输入校验补齐 【中】
| 位置 | 补什么 |
|---|---|
| `admin.js` PUT `/articles/:id` | 标题 ≤100 字校验(与 POST 一致) |
| `admin.js` POST/PUT 文章 | summary ≤200 字校验 |
| `profileService.js` | bio ≤2000 字裁剪 |
| `profileService.js` + `admin.js` settings | social/avatarUrl/bgUrl/coverUrl 仅允许 `http(s)://` 或相对路径 `/` 开头,拒绝 `javascript:` 等 |

### 1.5 上传像素尺寸上限 【中】
- `fileService.js` 加 `image-size` 或解析头信息:宽高 ≤4000px,超限拒绝(防 5MB 图片解压超大像素)

---

## 2. 前端功能调整(公开站)

### 2.1 移除归档页 【用户要求】
- 删除 `src/views/ArchiveView.vue`
- `router/index.js` 移除 `/archive` 路由 + `archive` 标题
- `TopNavbar.vue` / `SiteFooter.vue` 移除"归档"入口链接
- **注意**:归档页当前调用不存在的 `getArticles`(审查 bug #4)——删除后此 bug 一并消失,无需另修

### 2.2 移除深色模式切换按钮 【用户要求】
- **现状**:全项目 0 处调用 `theme.toggle()`,本来就没有按钮 → **无需改动**,仅确认 TopNavbar 无主题按钮残留
- 深色样式保留(`html.ks-dark` + 系统跟随),但不提供手动切换入口

### 2.3 首页数据真实性修复 【低,最小改动】
- `HomeView.vue:267` 硬编码"5 分钟阅读"→ 改为按字数估算(与 PostView 同一纯函数)或直接移除该行
- `HomeView.vue:276` 硬编码"0 次阅读"→ 移除(无阅读量功能)
- 文章卡片无封面时的占位逻辑保持现状(不动设计)

---

## 3. 后台管理界面视觉统一(核心工作)

### 3.1 目标
后台 6 个视图从前端"内联/自建样式"全部迁移到公开站的设计令牌体系,视觉上与公开站一致(玻璃拟态卡片、渐变按钮、统一圆角/阴影、tokens.css 变量)。

### 3.2 涉及文件与做法
| 文件 | 做法 |
|---|---|
| `styles/tokens.css` | 确认后台所需变量齐全(玻璃面板、渐变、danger 色);缺则补充(如 `--danger`) |
| `admin/AdminLayout.vue` | 侧栏改玻璃拟态卡片样式,导航项 hover 效果对齐公开站;响应式:≤1024px 侧栏收起为图标条或顶部栏 |
| `admin/LoginView.vue` | 重写为居中毛玻璃卡片(与公开站 ProfileCard 同款面板),背景用站点渐变/背景图 |
| `admin/AdminDashboardView.vue` | 统计卡片用 `glass-panel` 样式,与公开站卡片一致 |
| `admin/AdminArticlesView.vue` | 表格容器玻璃化;按钮统一渐变 primary / danger 文本按钮;搜索框样式对齐 |
| `admin/AdminArticleEditView.vue` | 编辑器容器玻璃化;工具栏按钮、输入框、预览区对齐 tokens |
| `admin/AdminSettingsView.vue` | 表单分区卡片化;上传控件样式统一 |

### 3.3 统一原则
- 所有卡片:复用 `--panel` 背景 + `backdrop-filter: blur` + `--radius` + `--shadow`
- 主按钮:`linear-gradient(135deg, var(--accent), var(--accent-2))`;危险操作用 `--danger` 文本色
- 输入框:统一 `--input-bg` / focus 高亮(若 tokens 缺则补)
- **消除三份重复定义**(AdminArticles/AdminArticleEdit/AdminSettings 各有一份 btn/input 样式)→ 抽到公共类或 tokens.css
- 深色模式:后台跟随 `html.ks-dark` 自动适配(不加切换按钮)

---

## 4. 垃圾代码清理

### 4.1 死代码组件
| 组件 | 处理 |
|---|---|
| `components/AnnouncementCard.vue` | 删除(0 引用;公告展示已并入 ProfileCard) |
| `components/ScrollProgressBar.vue` | 删除(0 引用) |
| `components/ConfirmDialog.vue` | **先统一后台 confirm → 接入 ConfirmDialog 后再保留**;若确认对话框改为原生,则删除 |
| `components/Toast.vue` | 同 ConfirmDialog:后台 alert 接入 Toast 后保留,否则删除 |
| `components/FortuneCard.vue` | 保留(FortuneView 在用) |

### 4.2 死 CSS 与冗余
- `tokens.css`:删除未用变量(`--content-max`、`--mint` 等,逐个确认)
- `HomeView.vue`:删除 `.col-header/.col-more/.empty-bubble` 等未用样式
- `App.vue`:`is-public` 类无样式 → 清理
- 各后台视图重复样式 → 统一后删除

### 4.3 其他垃圾
- 根目录 `check.mjs`、`probe.mjs` 删除
- `frontend/dist/` 整体删除,重新 `vite build` 只留最新一份
- 数据库探针文章(id=3「探针-学习文章」)删除(经后台或脚本)
- `backend/static/uploads/202607/` 下 6 个 70 字节测试 png 清理(确认无引用后)
- 后台原生 `alert/confirm` 全部替换为 Toast/ConfirmDialog(若保留)

---

## 5. 测试补充

| 用例 | 文件 | 内容 |
|---|---|---|
| 分类筛选 | `public.test.js` | `GET /api/articles?cat=study` 只返回 study;非法 cat 回退 diary |
| 分类入库 | `admin.test.js` | POST/PUT 文章带 category 保存/更新;非法 category 回退 |
| bgUrl | `admin.test.js` | PUT settings 带 bgUrl 保存并读回 |
| 上传边界 | `admin.test.js` | 超 5MB 拒、伪造扩展名拒(已有 SVG 用例) |
| 校验新增 | `admin.test.js` | PUT 标题超 100 拒;summary 超 200 拒;social 含 `javascript:` 拒 |

---

## 6. 部署就绪

### 6.1 migration 重建 【严重】
- 删除 `migrations/20260731175251_init/`(SQLite 方言 + 缺列)
- `schema.prisma` 数据源改为 `provider = "postgresql"`(生产);本地开发用 `.env` 指 SQLite 的方案需二选一:
  - **推荐**:统一 PostgreSQL 方言,本地用 Neon 免费库或 Docker PG;或
  - 保留 SQLite 本地 + `prisma migrate dev` 生成双套 migration(维护成本高)
- 重新 `prisma migrate dev --name init` 生成含 `bgUrl`/`category`/索引的干净 migration

### 6.2 部署配置
- 添加 `backend/Procfile`:`web: npm start`(Render 用)
- 或 `render.yaml`(可选)
- `CNAME` 文件(前端域名)
- 决定部署方式(见 §8 决策点)

### 6.3 README
- 根目录 README.md:本地运行、环境变量、部署步骤、测试命令

---

## 7. 执行顺序

| 步骤 | 内容 | 验证 |
|---|---|---|
| 1 | 安全修复(1.1–1.5)+ probe/check 删除 | 后端测试绿 |
| 2 | migration 重建 + PG 方言 | `prisma migrate deploy` 干净执行 |
| 3 | 前端调整:删归档页、删死代码、首页数据修复 | build 通过、路由正常 |
| 4 | 后台视觉统一(3.1–3.3) | 浏览器检查 6 个后台页 |
| 5 | 垃圾清理(4.1–4.3) | 无未引用 import、dist 单份 |
| 6 | 补测试(§5) | 全量测试绿 |
| 7 | 部署配置 + README | 本地按 README 跑通 |

---

## 8. 已确认决策(2026-08-01 用户拍板)

| 决策点 | 结论 |
|---|---|
| 部署方式 | **X**:后端 Express 托管 `frontend/dist`,同源 `bianra.com`,单 Render 服务 |
| 深色模式 | **固定深色**:默认深色外观,不做切换按钮,不跟随系统(移除 prefers-color-scheme 逻辑) |
| 本地数据库 | **全 PG**:本地开发连 Neon 免费库,与生产一致,消除 migration 双套问题 |
| 后台弹窗 | **接入 ConfirmDialog + Toast** 替换原生 alert/confirm(方案推荐项,未另行指定) |
| 前端设计 | 公开站视觉/布局/动效一律不动;移除归档页;首页硬编码数据最小修复 |
