// 测试公共助手: 确保 test.db schema 就绪 + 清表 + 构造测试数据
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// backend 根目录 (tests/ 的上一级), prisma 命令需在此目录执行以找到 schema.prisma
const backendDir = path.resolve(__dirname, '..')

let schemaReady = false

// 同步 schema 到测试 schema (幂等; 仅在本文件首次执行)
// process.env.DATABASE_URL 由 tests/env.js 注入为 ?schema=test
// --accept-data-loss 仅作用于一次性测试 schema, 安全
export async function ensureSchema() {
  if (schemaReady) return
  // Windows 下 npx.ps1 可能被执行策略阻止, 优先用 npx.cmd
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  execSync(`${npx} prisma db push --skip-generate --accept-data-loss`, {
    stdio: 'pipe',
    cwd: backendDir,
    timeout: 120000, // 跨网络首次建表可能较慢
  })
  schemaReady = true
}

// 每个用例前: 清表 + 重建 Profile 单例
export async function resetDb() {
  await ensureSchema()
  await prisma.article.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.admin.deleteMany()
  // 用 upsert 替代 create: 避免 deleteMany 与序列残留导致的 unique 冲突
  await prisma.profile.upsert({
    where: { id: 1 },
    update: {},
    create: {
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
  const { tags, ...rest } = overrides
  return prisma.article.create({
    data: {
      title: '测试文章',
      summary: '摘要',
      content: '# 正文',
      coverUrl: '',
      tags: '[]',
      ...rest,
      // tags 传数组则序列化
      ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}),
    },
  })
}

// 构造测试管理员 (默认用户名 admin / 密码 test123456)
export async function createAdmin(username = 'admin', password = 'test123456') {
  const passwordHash = await bcrypt.hash(password, 10)
  return prisma.admin.create({ data: { username, passwordHash } })
}
