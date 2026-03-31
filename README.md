# bianra的小屋

这是一个使用 Flask 框架开发的个人博客/留言板 Web 项目，采用前后端分离架构。前端部署在 GitHub Pages，后端部署在 Render。

## 项目架构

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   GitHub Pages  │      │   Render.com    │      │   PostgreSQL    │
│   (前端静态页面) │ <--> │   (Flask API)   │ <--> │   (数据存储)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## 项目结构

```
my_site/
├── app.py                 # Flask 后端主文件
├── index.html            # 前端页面（GitHub Pages）
├── requirements.txt      # Python 依赖
├── Procfile             # Render 部署配置
├── CNAME                # 自定义域名配置
├── .gitignore           # Git 忽略文件
├── README.md            # 项目说明
├── package.json         # Node.js 配置（预留）
└── static/
    └── images/
        ├── cover.jpg    # 封面背景图
        └── splash_bg.jpg # 备用背景图
```

## 各文件功能详解

### 后端文件

#### `app.py`
Flask 应用主文件，提供 RESTful API 服务：

**数据模型：**
- `Message` - 留言模型（id, content, likes, created_at）
- `Article` - 随笔模型（id, title, content, created_at）
- `Profile` - 个人资料模型（id, name, bio, announcement）

**API 端点：**
- `GET /api/messages` - 获取所有留言
- `POST /api/messages` - 发布留言
- `DELETE /api/messages/<id>` - 删除留言
- `POST /api/messages/<id>/like` - 点赞留言
- `GET /api/articles` - 获取所有随笔
- `POST /api/articles` - 发布随笔
- `DELETE /api/articles/<id>` - 删除随笔
- `GET /api/profile` - 获取个人资料
- `POST /api/profile` - 更新个人资料（需密码验证）

#### `requirements.txt`
Python 依赖包列表：
- Flask - Web 框架
- flask-cors - 跨域支持
- flask-sqlalchemy - ORM 数据库操作
- psycopg2-binary - PostgreSQL 驱动
- gunicorn - WSGI HTTP 服务器

#### `Procfile`
Render 平台部署配置文件：
```
web: gunicorn app:app
```

### 前端文件

#### `index.html`
纯 HTML + JavaScript 前端页面，包含以下功能模块：

**页面结构：**
1. **封面区域** - 全屏背景图 + 头像 + 标题
2. **内容区域** - 留言列表 + 随笔列表（标签切换）
3. **侧边栏** - 个人资料卡片 + 欢迎信息
4. **左侧菜单** - 发布/查看留言和随笔的入口

**主要功能：**
- 响应式设计，支持桌面端和移动端
- 滚动时菜单按钮和侧边栏的显示/隐藏动画
- 左侧滑出菜单（移动端优化）
- 模态框：发布留言、发布随笔、密码验证
- 个人资料编辑（密码保护）

**JavaScript 函数：**
- `fetchMessages()` - 获取并显示留言列表
- `fetchArticles()` - 获取并显示随笔列表
- `fetchProfile()` - 获取并显示个人资料
- `submitMessage()` - 提交新留言
- `submitArticle()` - 提交新随笔
- `likeMessage()` - 点赞功能
- `deleteMessage()` - 删除留言
- `deleteArticle()` - 删除随笔
- `toggleMenu()` - 切换左侧菜单显示
- `handleScroll()` - 处理滚动事件，控制元素显示/隐藏
- `handleAvatarClick()` - 头像点击事件（打开密码验证）
- `checkPassword()` - 验证管理密码
- `saveProfile()` - 保存个人资料修改

### 配置文件

#### `CNAME`
自定义域名配置，内容为：
```
www.bianra.com
```

#### `.gitignore`
Git 版本控制忽略文件列表：
- Python 虚拟环境（venv/）
- 本地数据库（*.db）
- 缓存文件（__pycache__/）
- 下载文件（downloads/）

## 功能特性

### 已实现功能

1. **留言板**
   - 发布留言
   - 查看留言列表（按时间倒序）
   - 删除留言
   - 点赞功能（显示点赞数）
   - 时间显示（北京时间 CST）

2. **随笔系统**
   - 发布随笔（标题 + 内容）
   - 查看随笔列表
   - 删除随笔
   - 时间显示

3. **个人资料**
   - 显示头像、名字、简介
   - 密码保护的管理后台（默认密码：200709）
   - 可编辑名字、简介、公告栏

4. **UI/UX**
   - 全屏封面背景图
   - 平滑的滚动动画
   - 响应式设计（适配移动端）
   - 左侧滑出菜单
   - 模态框交互
   - 悬停效果

### 技术特点

- **前后端分离**：前端静态页面 + Flask REST API
- **跨域支持**：使用 flask-cors 处理跨域请求
- **数据库**：PostgreSQL（生产环境）/ SQLite（开发环境）
- **时区处理**：统一使用北京时间（CST, UTC+8）
- **响应式布局**：CSS Media Query 适配不同屏幕
- **动画效果**：CSS Transition 实现平滑过渡

## 部署说明

### 前端部署（GitHub Pages）

1. 推送代码到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 配置自定义域名（CNAME 文件）

### 后端部署（Render）

1. 在 Render 创建新的 Web Service
2. 连接 GitHub 仓库
3. 配置环境变量：
   - `DATABASE_URL` - PostgreSQL 连接字符串
   - `PYTHON_VERSION` - 3.10.0
4. Render 会自动读取 Procfile 部署

## 本地开发

### 环境准备

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 运行开发服务器

```bash
python app.py
```

访问 http://127.0.0.1:5000 查看效果

### 前端开发

前端页面为纯静态 HTML，可直接在浏览器中打开 index.html 进行预览。
注意：需要修改 `API_BASE_URL` 为本地后端地址：
```javascript
const API_BASE_URL = 'http://127.0.0.1:5000/api';
```

## 注意事项

1. **密码安全**：默认管理密码为 `200709`，生产环境请修改
2. **数据库**：生产环境务必使用 PostgreSQL，SQLite 不适合生产环境
3. **CORS**：生产环境请配置正确的 CORS 白名单
4. **静态资源**：封面图等静态资源需要手动上传到 static/images 目录

## 更新日志

- 优化移动端 UI 设计
- 添加左侧滑出菜单
- 删除无用代码和元素
- 修复头像显示问题
- 统一时区为北京时间
