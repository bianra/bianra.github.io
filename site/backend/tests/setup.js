// 测试公共助手: 确保 test.db schema 就绪 + 清表 + 构造测试数据
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// backend 根目录 (tests/ 的上一级), prisma 命令需在此目录执行以找到 schema.prisma
const backendDir = path.resolve(__dirname, '..')

let schemaReady = false

// 同步 schema 到 test.db (幂等; 仅在本文件首次执行)
// process.env.DATABASE_URL 由 tests/env.js 注入为 test.db
// --accept-data-loss 仅作用于一次性 test.db, 安全
export async function ensureSchema() {
  if (schemaReady) return
  // Windows 下 npx.ps1 可能被执行策略阻止, 优先用 npx.cmd
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  execSync(`${npx} prisma db push --skip-generate --accept-data-loss`, {
    stdio: 'pipe',
    cwd: backendDir,
  })
  schemaReady = true
}

// 每个用例前: 清表 + 重建 Profile 单例
export async function resetDb() {
  await ensureSchema()
  await prisma.article.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.admin.deleteMany()
  await prisma.profile.create({
    data: {
      id: 1,
      name: 'bianra',
      bio: '关于我',
      announcement: '欢迎',
      avatarUrl: '',
      social: '[{"label":"GitHub","url":"https://github.com/xxx"}]',
    },
  })
}

// 构造一篇测试文章
export async function createArticle(overrides = {}) {
  return prisma.article.create({
    data: {
      title: '测试文章',
      summary: '摘要',
      content: '# 正文',
      coverUrl: '',
      ...overrides,
    },
  })
}
