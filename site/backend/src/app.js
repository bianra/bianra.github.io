// createApp(): 中间件链 + 路由挂载 + 错误处理 + 静态目录
// 阶段 1: 仅 /health 与静态托管; 后续阶段挂载 /api 与 /admin/api 路由

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import pg from 'pg'
import morgan from 'morgan'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { config } from './config.js'
import { prisma } from './db.js'
import { publicRouter } from './routes/public.js'
import { adminRouter } from './routes/admin.js'
import { getUpload } from './services/fileService.js'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ===== 会话存储: PostgreSQL (connect-pg-simple), 重启/部署不丢登录态 =====
// - 测试环境: MemoryStore(集成测试无需持久会话, 避免依赖/污染数据库)
// - 生产/开发: PG store, 显式 CREATE TABLE IF NOT EXISTS 确保 session 表存在
//   (Neon 连接池下 createTableIfMissing 的自动 DDL 不可靠, 故手动建表)
// - 开发时数据库不可达则回退 MemoryStore(仅警告); 生产拒绝降级
const PgSession = connectPgSimple(session)
const sessionPool = new Pool({ connectionString: config.databaseUrl, max: 5 })

const SESSION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
  );
  CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
`

async function createSessionStore() {
  if (config.nodeEnv === 'test') {
    return new session.MemoryStore()
  }
  try {
    // 显式建表 (幂等), 再探测写读一次确认可用
    await sessionPool.query(SESSION_TABLE_SQL)
    const store = new PgSession({ pool: sessionPool, createTableIfMissing: false })
    const probeId = `probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await new Promise((resolve, reject) => {
      store.set(probeId, { ok: true }, (err) => (err ? reject(err) : resolve()))
    })
    await new Promise((resolve) => store.destroy(probeId, () => resolve()))
    return store
  } catch (e) {
    if (config.isProd) {
      console.error('❌ 生产环境无法初始化 PG 会话存储(拒绝降级为 MemoryStore):', e.message)
      throw e
    }
    console.warn('⚠️  PG 会话存储初始化失败, 开发环境回退 MemoryStore(重启即失效):', e.message)
    return new session.MemoryStore()
  }
}

export async function createApp() {
  const app = express()

  // 信任代理 (生产环境反代后才能拿到真实协议/域名)
  app.set('trust proxy', 1)

  // 安全头: 允许跨域加载上传的图片资源; 放开 img-src 允许外链图床图片
  // (先剔除默认 img-src 再覆盖, 避免 duplicate directive)
  const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives()
  delete cspDirectives['img-src']
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...cspDirectives,
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }))

  // 跨域 (带凭证 cookie)
  app.use(cors({ origin: config.corsOrigin, credentials: true }))

  // cookie & 会话 (PostgreSQL 持久化, 重启不丢)
  const sessionStore = await createSessionStore()
  app.use(cookieParser())
  app.use(session({
    name: 'bianra.sid',
    store: sessionStore,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // 生产默认要求 HTTPS;本地 HTTP 隧道体验时可设 COOKIE_SECURE=false
      secure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : config.isProd,
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

  // ===== 上传文件读取 (数据库存储, /uploads/:id) =====
  // 放在 express.static 之前, 拦截 /uploads/:id 从数据库读图片
  app.get('/uploads/:id', async (req, res, next) => {
    try {
      const upload = await getUpload(req.params.id)
      if (!upload) return res.status(404).json({ error: '文件不存在' })
      res.set('Content-Type', upload.mime)
      res.set('Cache-Control', 'public, max-age=31536000, immutable')
      res.send(upload.data)
    } catch (e) {
      next(e)
    }
  })

  // 静态托管 (robots.txt 等; 上传文件已改存数据库, 不再依赖磁盘目录)
  app.use(express.static(path.join(__dirname, '..', 'static')))

  // ===== 方案 X: 生产同源部署, Express 托管前端构建产物 =====
  // 生产环境 (NODE_ENV=production) 托管前端 dist;
  // Render 构建会把 frontend/dist 复制到 static/dist (rootDir 内, 运行时保留)
  // 路径优先级: 1) static/dist (Render 生产)  2) frontend/dist (本地生产模拟)
  const staticDist = path.join(__dirname, '..', 'static', 'dist')
  const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist')
  const serveDist = config.isProd && (existsSync(staticDist) ? staticDist : existsSync(frontendDist) ? frontendDist : null)
  if (serveDist) {
    app.use(express.static(serveDist))
    // SPA history 路由 fallback: 非 /api /admin/api /uploads /health 的 GET 都回 index.html
    app.get(/^(?!\/(api|admin\/api|uploads|health|robots\.txt)).*/, (req, res, next) => {
      if (req.method !== 'GET') return next()
      res.sendFile(path.join(serveDist, 'index.html'))
    })
    console.log('🌐 生产模式: 托管前端 dist 于', serveDist)
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
