# 开发日记:bianra 小屋 v2 从零到上线

> 记录时间:2026-07-31 ~ 2026-08-01
> 主角:bianra(站长)+ AI 助手(Reasonix)
> 项目:个人网站「bianra 小屋 v2」——Express + Prisma + Vue 3,已上线 www.bianra.com

---

## 2026-07-31(周四)

### 上午 · 起念:旧站不想要了

打开旧仓库 `bianra/bianra.github.io`,是一个 Flask + 原生 JS 的个人网站 + 留言板,81 次提交。功能挺全,但代码看完有点一言难尽:

- 后台管理是手写 hash 路由的大 JS 文件,难维护
- **留言审批接口有,但后台根本没有审批按钮**——新留言永远卡在"待审批"
- 点赞、发留言**零防刷**,可以被脚本刷爆
- 默认密码 `200709` 硬编码在代码里,迁移用 PostgreSQL 语法,本地 SQLite 一跑就炸

看完心里就一个念头:**推倒重来**。旧的再好也是旧的了,何况它还有这些坑。

### 中午 · 第一次踩坑:GitHub 连不上

想把旧代码先 clone 到本地,结果网络给了一记闷棍:

```
error: RPC failed; curl 56 Recv failure: Connection was reset
```

`github.com` 的连接被重置,只有 `codeload.github.com`(下载 zip 的 CDN)是通的。于是改用 zip 下载——代码到手,但没有 git 历史。

后来装了 Git、配了 SSH key,才把仓库重建起来。这是今天第一次意识到:**这个网络环境,访问 GitHub 要碰运气**。

### 下午 · 看到喜欢的网站:killerkiller星

用户给我看了一个参考站:一个 WordPress 个人博客,玻璃拟态 + 深色主题 + 每日抽卡 + AI 对话 + Live2D 看板娘。我把它整个扒下来分析了一遍:

- 前端是**原生 JS**,没有框架,但视觉设计很精致:CSS 变量三色渐变、毛玻璃卡片、视频背景轮播
- **每日抽卡是纯前端的**——用 FNV-1a 哈希 + 日期做种子,同一天结果恒定,零后端成本,这设计绝了
- AI 对话走后端代理,key 不泄露

用户喜欢这个风格,但明确说:**不要留言、不要登录、不要 AI 对话**,只要"发布文章配图 + 管理文章"。

### 傍晚 · 定方案:全 Node

技术栈讨论了好几轮:
- Flask + 原生 JS?不好,旧站的坑就是它
- NestJS?太重,杀鸡用牛刀
- Next.js?要学 React,收益不明显
- **最终定了:Express 5 + Prisma + Vue 3**

理由朴素:用户机器上只有 Node,一套环境跑通;Prisma 统一管理数据库,彻底避开旧项目"SQLite/PG 兼容"的坑;Vue 3 组件化,后台不再手写大 JS。

我把方案写成了 24KB 的详细设计文档(PROJECT_PLAN.md):数据模型、API 规格、前端组件树、实施计划,一应俱全。

---

## 2026-08-01(周五)

### 上午 · 验收旧成果,发现问题一堆

工作区里已经有一个按方案做的 `my_site`(之前 AI 协助的进度),到了阶段 7。我全面通览后,发现**看着能跑,实际隐患不少**:

🔴 **严重**:
- seed.js 硬编码密码 `bianra123`,`ADMIN_PASSWORD` 环境变量根本没被读取
- 有个 `probe.mjs` 诊断脚本,**管理密码就写在里面**
- **数据库迁移和 schema 不一致**:`bgUrl`/`category` 字段是 `db push` 直接同步的,没生成 migration——生产 `prisma migrate deploy` 建的表会缺列,启动即崩
- 归档页调用不存在的 API,页面永远空白

🟠 中危:生产 session 用内存存储、登录没防会话固定、上传没像素校验、后台样式重复定义三份……

**结论:先修再上,不能带着这些上线。**

### 上午 · 执行修复(7 大步)

1. **安全修复**:seed 改读环境变量/随机生成、删 probe.mjs、登录加 `session.regenerate()`、校验补齐、URL 协议白名单、上传加像素上限
2. **迁移重建**:统一 PostgreSQL(Neon),删掉 SQLite 方言迁移重新生成
3. **前端调整**:删归档页、删死代码、首页数据真实化、固定深色
4. **后台视觉统一**:按钮/分页类提升到全局 tokens,删三份重复定义
5. **垃圾清理**:dist 从 439 个文件清理到 1 份、删无引用图片、删死 CSS
6. **补测试**:37 → 52 个用例全绿
7. **部署配置**:Express 托管前端、Procfile、render.yaml、README

### 下午 · 本地验收,连续修 bug

修完开始本地跑,一路修:

- **背景图传不上去**:"图片过大"——我加的 4000px 像素限制对全站背景图太严,放宽到 8000px
- **后台登录后一直转圈**:多个后端进程抢 3000 端口 + Neon 休眠,杀掉重来
- **点导航分类回到封页**:scrollBehavior 强制回顶部覆盖了我的滚动,改成在 scrollBehavior 里直接定位内容区
- **侧栏文章数**:从硬编码"0"改成实时显示日记/学习/代码三个分类数量(后端加了 `/api/category-counts`)
- **每日抽卡 → 每日抽签**,去掉未抽时的树叶图案
- **删掉关于页**(连同后台"关于页长文"改成"简介")

### 傍晚 · 推送:SSH key 的魔幻之旅

准备推送时,SSH 一直 `Permission denied (publickey)`。verbose 日志显示诡异一幕:

```
Offering public key: ...SHA256:AvNciQc...QQB8
Server accepts key:  ...SHA256:AvNciQc...QQB8I
```

指纹差一个字符?其实是显示截断。真正的问题藏在后面——**`ssh-keygen -y` 从私钥推导公钥直接挂起,私钥文件损坏了**!

用户重新生成了一把新 key,添加后 `ssh -T git@github.com` 终于返回那句熟悉的:

```
Hi bianra! You've successfully authenticated!
```

推送成功:`+ 441fdff...5fd35e0 main -> main (forced update)`,旧仓库被新代码覆盖。

### 晚上 · 部署:连续四关

**第一关:Blueprint 要付费?**
render.yaml 没写 `plan: free`,默认走了付费档。加一行 `plan: free` 解决。

**第二关:构建失败**
日志显示 `Could not resolve '@vitejs/plugin-vue'`——Render 构建环境继承 `NODE_ENV=production`,`npm ci` 跳过 devDependencies,而 vite 和插件都在 devDependencies 里。前端构建前加 `NODE_ENV=development npm ci` 解决。

**第三关:前端全 404**
后端 API 都通,但 `/`、`/fortune` 全 404。查半天发现:**Render 的 `rootDir: site/backend`,运行时只保留这个目录**——前端 dist 构建在 rootDir 之外,运行时根本不存在。修复:构建后把 dist 复制到 `backend/static/dist`。

**第四关:域名**
阿里云买的域名,之前指向旧的 GitHub Pages。改 DNS:
- `www` → CNAME → `bianra-site.onrender.com`
- 裸域 → A 记录 → Render IP
- Render 添加自定义域名,自动签 HTTPS 证书

`https://www.bianra.com` 打开那一刻,主页、后台、health 全 200,新站上线!

### 深夜 · 善后

- **字体**:Google Fonts CDN 国内加载卡顿,下载字体本地托管。用户换了三轮风格:优雅花体 → 圆润手写 → 粗壮清晰的 Lobster,最终定稿
- **上传图片部署后丢失**:Render 免费实例磁盘不持久(持久磁盘要付费),图片每次部署就没了。改成**上传存数据库**(Upload 表存二进制),彻底解决

---

## 上线后 · 最终形态

```
bianra.com / www.bianra.com
        │
        ▼
Render 免费实例(Express 5 + Node 24)
  ├── 前端 dist(SPA,Vue 3)  ← 同源托管
  ├── 公开 API + 后台 API
  └── 上传图片
        │
        ▼
Neon PostgreSQL 17(免费)—— 文章/资料/图片全在这
```

- 代码:GitHub `bianra/bianra.github.io`
- 测试:52 个用例全绿
- 域名:阿里云 DNS → Render,HTTPS 自动签发

---

## 这次学到的

1. **"看着能跑"不等于能上线**——迁移不一致、凭据硬编码这类问题,只有部署那一刻才暴露
2. **免费 PaaS 处处是坑**:免费实例磁盘不持久、构建环境 NODE_ENV 会传染、rootDir 只保留子目录——每个坑都真实踩过
3. **存数据库比存磁盘可靠**:对于小文件,数据库存储绕开了免费实例的所有文件系统限制
4. **修 bug 要找到根因**:登录转圈不是登录的问题,是端口被多进程抢占;字体模糊不是字体的问题,是 CDN 加载失败

> 从起念到上线,24 小时。下一站:把内容填满它。
