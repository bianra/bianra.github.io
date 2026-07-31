// Article 服务: 列表(分页, 不含 content)、详情(含 content)
import { prisma } from '../db.js'

// 列表只查这些字段 (排除 content 提升性能)
const LIST_SELECT = {
  id: true,
  title: true,
  summary: true,
  coverUrl: true,
  createdAt: true,
  updatedAt: true,
}

// 解析分页参数, 做边界裁剪
function parsePaging({ page, limit } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const l = Math.min(100, Math.max(1, Number(limit) || 6))
  return { page: p, limit: l }
}

// GET /api/articles?page=&limit=
export async function listArticles(query = {}) {
  const { page, limit } = parsePaging(query)
  const [items, total] = await Promise.all([
    prisma.article.findMany({
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count(),
  ])
  return { items, total, page, pages: Math.ceil(total / limit) || 0 }
}

// GET /api/articles/:id (含 content)
export async function getArticleById(id) {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) return null
  return prisma.article.findUnique({ where: { id: n } })
}

// 归档用: 取较多条目 (按时间倒序, 不含 content)
export async function listAllForArchive(limit = 100) {
  return prisma.article.findMany({
    select: LIST_SELECT,
    orderBy: { createdAt: 'desc' },
    take: Math.min(500, Math.max(1, Number(limit) || 100)),
  })
}
