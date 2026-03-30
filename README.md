# 我的 Python 网站

这是一个使用 Python 和 Django 框架开发的 Web 项目。

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
   python manage.py runserver
   ```

访问 [http://127.0.0.1:8000/](http://127.0.0.1:8000/) 查看效果。

## 项目结构

- `config/`: 项目配置文件
- `core/`: 核心应用逻辑
- `venv/`: Python 虚拟环境
- `manage.py`: Django 管理脚本
