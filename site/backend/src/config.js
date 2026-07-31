// 环境变量集中读取与校验
// 安全要求: SESSION_SECRET 缺失则拒绝启动

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function requireEnv(name) {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`缺少必需环境变量: ${name} (请在 .env 中配置, 参见 .env.example)`)
  }
  return value
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  isProd: process.env.NODE_ENV === 'production',
  databaseUrl: requireEnv('DATABASE_URL'),
  sessionSecret: requireEnv('SESSION_SECRET'),
  // CORS 白名单 (前端地址)
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // 管理员初始密码; 留空 = seed 时随机生成并打印
  adminPassword: process.env.ADMIN_PASSWORD || '',
  // 站点地址 (RSS link / robots sitemap 用; 生产 https://bianra.com)
  siteUrl: process.env.SITE_URL || 'https://bianra.com',
  // 上传文件落盘目录
  uploadsDir: path.join(__dirname, '..', 'static', 'uploads'),
}
