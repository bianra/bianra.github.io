// createApp(): 中间件链 + 路由挂载 + 错误处理 + 静态目录
// 阶段 1: 仅 /health 与静态托管; 后续阶段挂载 /api 与 /admin/api 路由

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import morgan from 'morgan'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { config } from './config.js'
import { prisma } from './db.js'
import { publicRouter } from './routes/public.js'
import { adminRouter } from './routes/admin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp() {
  const app = express()

  // 信任代理 (生产环境反代后才能拿到真实协议/域名)
  app.set('trust proxy', 1)

  // 安全头: 允许跨域加载上传的图片资源
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

  // 跨域 (带凭证 cookie)
  app.use(cors({ origin: config.corsOrigin, credentials: true }))

  // cookie & 会话
  // 开发: MemoryStore (单管理员本地够用)
  // 生产: 切换 connect-pg-simple 持久化 (部署阶段配置)
  if (config.isProd) {
    console.warn('⚠️  生产环境使用 MemoryStore, session 重启即丢失; 部署前请切换 connect-pg-simple 持久化')
  }
  app.use(cookieParser())
  app.use(session({
    name: 'bianra.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    },
  }))

  // 日志
  app.use(morgan(config.isProd ? 'combined' : 'dev'))

  // body 解析 (限制 1MB, 大文件走 multipart 上传接口)
  app.use(express.json({ limit: '1mb' }))

  // 健康检查
  app.get('/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ status: 'ok', db: 'connected' })
    } catch (e) {
      console.error('健康检查数据库查询失败:', e)
      res.status(503).json({ status: 'degraded', db: 'disconnected' })
    }
  })

  // 公开 API
  app.use('/api', publicRouter)

  // 后台 API (login 无需鉴权, 其余经 requireAdmin 保护)
  app.use('/admin/api', adminRouter)

  // 静态托管 (uploads/* 与 robots.txt 等)
  app.use(express.static(path.join(__dirname, '..', 'static')))

  // ===== 方案 X: 生产同源部署, Express 托管前端构建产物 =====
  // 生产环境 (NODE_ENV=production) 托管 frontend/dist; 开发仍用 Vite dev server (5173)
  const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist')
  if (config.isProd && existsSync(frontendDist)) {
    app.use(express.static(frontendDist))
    // SPA history 路由 fallback: 非 /api /admin/api /uploads /health 的 GET 都回 index.html
    app.get(/^(?!\/(api|admin\/api|uploads|health|robots\.txt)).*/, (req, res, next) => {
      if (req.method !== 'GET') return next()
      res.sendFile(path.join(frontendDist, 'index.html'))
    })
    console.log('🌐 生产模式: 托管前端 dist 于', frontendDist)
  }

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: '资源不存在' })
  })

  // 错误处理 (生产环境隐藏堆栈)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // multer 上传错误 (文件超限等)
    if (err?.code?.startsWith?.('LIMIT_')) {
      return res.status(400).json({ error: '文件大小超过 5MB 限制' })
    }
    console.error(err)
    res.status(err.status || 500).json({
      error: config.isProd ? '服务器内部错误' : err.message,
    })
  })

  return app
}
