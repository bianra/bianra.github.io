// 测试公共助手: 确保 test.db schema 就绪 + 清表 + 构造测试数据
import { execSync } from 'node:child_process'
import { prisma } from '../src/db.js'

let schemaReady = false

// 同步 schema 到 test.db (幂等; 仅在本文件首次执行)
// process.env.DATABASE_URL 由 vitest environmentVariables 注入为 test.db
export async function ensureSchema() {
  if (schemaReady) return
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'pipe',
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
