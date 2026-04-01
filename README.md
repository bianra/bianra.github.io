# 我的 Python 网站

这是一个使用 Python 和 Flask 框架开发的个人留言板 Web 项目。

## 快速开始

1. **创建并激活虚拟环境**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   source venv/bin/activate  # macOS/Linux
   ```

2. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

3. **运行开发服务器**
   ```bash
   python app.py
   ```

访问 [http://127.0.0.1:5000/](http://127.0.0.1:5000/) 查看效果。

## 项目结构

- `app.py`: Flask 应用主文件
- `index.html`: 前端页面（纯 HTML + JavaScript）
- `static/`: 静态资源目录
- `venv/`: Python 虚拟环境

## 部署

项目已配置 Procfile，支持部署到 Render 等平台：

```bash
gunicorn app:app
```

## 功能特性

- 📝 留言板：发布、查看、删除留言
- ❤️ 点赞功能
- 👤 个人资料管理
- 🔒 密码保护的管理后台
- 📱 响应式设计，支持移动端