# 项目进度报告（完整版）

> 生成时间：2026-08-01
> 当前阶段：阶段 7（联调 + 收尾）
> 项目计划文档：PROJECT_PLAN.md（阶段 1-6 已完成，阶段 7 进行中）

---

## 一、已完成事项

### 需求 1：侧边导航栏分类功能 — 代码完成 ✅

**问题**：左侧导航四个选项（首页/日记/学习/代码）点击后都回首页，无法按分类筛选。

**改动** `site/frontend/src/views/HomeView.vue`：
- 引入 `useRouter` / `computed` / `nextTick`
- 新增 `activeCat` 计算属性、`goHome()` / `goCat(cat)` 函数
- 侧边导航 4 个 `<a>` 改为 `@click.prevent` 调用，动态绑定 active 类
- 文章标签从硬编码"日记"改为 `{{ CAT_MAP[a.category] }}` 动态显示

### 需求 2：左侧信息框移除编辑功能 — 代码完成 ✅

**改动** `site/frontend/src/components/ProfileCard.vue`：
- 重写为纯只读展示，移除全部 inline 编辑逻辑（auth 检测、isEditing、编辑按钮、头像上传遮罩、输入框、保存/取消函数、相关 CSS）
- 所有资料编辑统一收归后台 `/admin/settings`（已确认后台覆盖头像/名字/公告/简介/社交/密码）
- FortuneCard（抽签游戏）和侧边导航无需改动

### 需求 3：后台背景图上传功能 — 代码完成 + 后端 E2E 验证通过 ✅

全链路改动：

| 文件 | 改动 |
|---|---|
| `site/backend/prisma/schema.prisma` | Profile 模型加 `bgUrl String @default("")`，已 `db push` 同步 |
| `site/backend/src/services/profileService.js` | `getProfile`/`updateProfile` 支持 bgUrl |
| `site/backend/src/routes/admin.js` | `PUT /settings` 解构并传递 bgUrl |
| `site/frontend/src/stores/profile.js` | `applyBgImage()` 写入 `:root` 的 `--bg-image`（空值回退默认渐变） |
| `site/frontend/src/App.vue` | `onMounted` 拉取并应用，全站任意页面生效 |
| `site/frontend/src/views/admin/AdminSettingsView.vue` | 背景图上传区块（预览+上传+恢复默认），保存后刷新 store 立即应用 |

### 需求 4：阶段 7 联调收尾 — 部分完成 🔄

#### ✅ 已完成并验证

| 子任务 | 验证方式 | 结果 |
|---|---|---|
| 后端 vitest 全量测试 | `npx.cmd vitest run` | **37 用例全绿**（admin 25 + public 12），test.db 隔离正常 |
| 前端 vite build | `npx.cmd vite build` | **0 错误 0 警告**，82 模块 395ms |
| 后端 E2E 全流程 | node fetch 脚本 | **10 步全绿**：登录→发文(study)→列表筛选→详情→背景图设置/读取→删除→登出 |

#### ✅ 已完成代码改动（联调发现的分类缺口）

联调发现后台发文无法设置分类，修复：
- `site/backend/src/routes/admin.js`：POST/PUT `/articles` 解构并传递 `category`（之前漏传）
- `site/frontend/src/views/admin/AdminArticleEditView.vue`：加分类下拉框（`category` ref + `CATS` 常量 + `<select>` UI + 保存/加载/草稿恢复都带 category）

#### ✅ 已完成代码改动（前端分类列表 bug 修复）

前端 UI 验证发现 `/?cat=study` 不显示文章，定位根因并修复：
- **根因**：`HomeView.vue` 调用 `publicApi.getArticles`（**不存在**），实际方法名是 `publicApi.listArticles`。调用不存在的方法抛 `TypeError`，被 `catch (_) {}` 静默吞掉，`articles.value` 永远是空数组
- **修复** `site/frontend/src/views/HomeView.vue`：`publicApi.getArticles` → `publicApi.listArticles`；响应解析简化为 `res?.items || []`
- **静态确认**：浏览器 agent 静态检查确认修复生效，参数 `cat=study` 能正确转发到后端

---

## 二、未完成事项

### 1. 前端分类列表修复的运行时验证 ⚠️
- 代码已修复且静态确认正确，但**未在浏览器中运行时验证**
- 阻塞原因：shell 环境被 PowerShell 执行策略阻塞（见第三节），前端 dev server 可能已停止

### 2. 探针文章未清理
- 数据库中残留 id=3 "探针-学习文章"（诊断脚本创建），**未删除**

### 3. 前端 dev server 状态未确认
- 浏览器 agent 报告 `localhost:5173` 连接被拒绝
- 可能 dev server 已停止，**未重启确认**

### 4. 移动端响应式检查 — 未开始
- 1024px / 640px 断点未验证

### 5. README 文档 — 未编写
- 本地运行 + 部署步骤 + 环境变量

### 6. 临时文件清理
- `check.mjs`（诊断脚本）还在项目根目录，**未删除**

### 7. 阶段 8 推送上线 — 未开始

---

## 三、当前环境阻塞

**PowerShell 执行策略问题**：toolhost 将 shell 命令封装成 `.ps1` 文件执行，而本机 PowerShell 执行策略（Restricted）禁止运行 `.ps1` 脚本，导致 `curl` / `node` 等验证命令无法执行。

- 早期命令（vitest / vite build / prisma db push / E2E 脚本）能正常执行
- 后期命令（curl localhost:5173 / node check.mjs）均被 `.ps1` 封装阻止
- 尝试非沙箱模式执行被用户拒绝

**后续验证需要**：在 IDE 终端手动执行（不受执行策略限制），或调整 PowerShell 执行策略（`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`）。

---

## 四、本次会话改动文件清单

### 后端（3 个文件 + 数据库）
- `site/backend/prisma/schema.prisma` — Profile 加 `bgUrl` 字段
- `site/backend/src/services/profileService.js` — `getProfile`/`updateProfile` 支持 bgUrl
- `site/backend/src/routes/admin.js` — `PUT /settings` 传 bgUrl；`POST/PUT /articles` 传 category
- 数据库：已 `prisma db push` 同步 bgUrl 字段

### 前端（6 个文件）
- `site/frontend/src/components/ProfileCard.vue` — 改为纯只读展示
- `site/frontend/src/stores/profile.js` — `applyBgImage` + 应用背景图
- `site/frontend/src/App.vue` — `onMounted` 拉取 profile 应用背景图
- `site/frontend/src/views/HomeView.vue` — 侧边导航分类功能 + 修复 `listArticles` 方法名
- `site/frontend/src/views/admin/AdminSettingsView.vue` — 背景图上传区块
- `site/frontend/src/views/admin/AdminArticleEditView.vue` — 分类下拉框

### 临时文件（待清理）
- `check.mjs` — 诊断脚本，待删除

---

## 五、验证状态汇总

| 验证项 | 状态 | 证据 |
|---|---|---|
| 后端单元测试 | ✅ 通过 | 37 用例全绿 |
| 前端生产构建 | ✅ 通过 | 0 错误 0 警告 |
| 后端 E2E 全流程 | ✅ 通过 | 10 步全绿（含分类筛选、背景图读写） |
| 背景图功能（后端） | ✅ 通过 | E2E 第 6/7 步验证 bgUrl 保存/读取 |
| 分类功能（后端） | ✅ 通过 | E2E 第 4 步验证 cat=study 筛选 |
| 前端分类列表修复 | ⚠️ 代码完成，未运行时验证 | 静态确认正确，shell 阻塞未验证 |
| 前端 UI 全流程 | 🔄 5/6 通过 | 6 步中 5 通过，1 失败（已定位修复但未复测） |
| 移动端响应式 | ⏳ 未开始 | |

---

## 六、下一步建议（按优先级）

1. **验证前端修复**：在 IDE 终端执行 `cd site/frontend && npm run dev`，浏览器访问 `http://localhost:5173/?cat=study`，确认文章列表正常显示
2. **清理探针文章**：登录后台删除 id=3 "探针-学习文章"
3. **删除临时文件**：`check.mjs`
4. **完成移动端响应式检查**：1024px / 640px 断点
5. **编写 README**：本地运行 + 部署步骤 + 环境变量
6. **阶段 7 收尾后进入阶段 8**：推送上线
