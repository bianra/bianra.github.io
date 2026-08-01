// 测试环境变量: 必须在 db.js (PrismaClient) 加载前设置 process.env
// Prisma 运行时会自动读 .env, 但 process.env 优先
//
// 全 PG 方案: 测试连接复用开发 Neon 库, 但通过 ?schema=test 隔离到独立 schema,
// 避免测试清表污染开发数据 (tests/setup.js 的 db push 只作用于 test schema)

import 'dotenv/config'

// 从 .env 读开发连接串, 追加独立测试 schema
function buildTestUrl() {
  const base = process.env.DATABASE_URL || ''
  if (!base) throw new Error('测试需要 .env 中的 DATABASE_URL')
  // 已有查询参数 → 追加; 否则新建
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}schema=test`
}

process.env.DATABASE_URL = buildTestUrl()
process.env.SESSION_SECRET = 'test-secret-xxx'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.NODE_ENV = 'test'
process.env.SITE_URL = 'https://bianra.com'
