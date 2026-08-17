// Article 服务: 列表(分页, 不含 content)、详情(含 content)
import { prisma } from '../db.js'

// 列表只查这些字段 (排除 content 提升性能)
const LIST_SELECT = {
  id: true,
  title: true,
  summary: true,
  coverUrl: true,
  category: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
}

// 合法分类
const VALID_CATS = ['study', 'code', 'chat']

// 解析 tags JSON → 数组 (非法/空 → [])
function parseTags(tags) {
  if (Array.isArray(tags)) return tags
  try {
    const arr = JSON.parse(tags || '[]')
    return Array.isArray(arr) ? arr.filter((t) => typeof t === 'string' && t.trim()) : []
  } catch {
    return []
  }
}

// 解析分页参数, 做边界裁剪
function parsePaging({ page, limit } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const l = Math.min(100, Math.max(1, Number(limit) || 6))
  return { page: p, limit: l }
}

// GET /api/articles?page=&limit=&cat=&q=
export async function listArticles(query = {}) {
  const { page, limit } = parsePaging(query)
  const cat = VALID_CATS.includes(String(query.cat)) ? String(query.cat) : null
  const q = String(query.q || '').trim()
  const tag = String(query.tag || '').trim()
  const where = {}
  if (cat) where.category = cat
  if (q) {
    // 全站搜索: 匹配标题 / 摘要 / 正文
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { content: { contains: q } },
    ]
  }
  if (tag) where.tags = { contains: `"${tag}"` }
  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ])
  // tags JSON → 数组
  const rows = items.map((a) => ({ ...a, tags: parseTags(a.tags) }))
  return { items: rows, total, page, pages: Math.ceil(total / limit) || 0 }
}

// GET /api/articles/:id (含 content)
export async function getArticleById(id) {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) return null
  const a = await prisma.article.findUnique({ where: { id: n } })
  if (!a) return null
  return { ...a, tags: parseTags(a.tags) }
}

// 标签云: 统计所有文章标签出现次数, 返回 [{name, count}] 按次数降序
export async function getTagCloud() {
  const articles = await prisma.article.findMany({ select: { tags: true } })
  const countMap = new Map()
  for (const a of articles) {
    for (const t of parseTags(a.tags)) {
      countMap.set(t, (countMap.get(t) || 0) + 1)
    }
  }
  return [...countMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

// 各分类文章数 (主页侧栏统计用): { study, code, chat }
export async function getCategoryCounts() {
  const groups = await prisma.article.groupBy({
    by: ['category'],
    _count: { _all: true },
  })
  const counts = { study: 0, code: 0, chat: 0 }
  for (const g of groups) {
    counts[g.category] = g._count._all
  }
  return counts
}

// ===== 后台 API 用 =====

// 后台列表 (标题模糊搜索 + 分页, 不含 content)
export async function listArticlesAdmin(query = {}) {
  const { page, limit } = parsePaging(query)
  const where = query.q ? { title: { contains: String(query.q) } } : {}
  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      select: { id: true, title: true, coverUrl: true, updatedAt: true, tags: true },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ])
  return {
    items: items.map((a) => ({ ...a, tags: parseTags(a.tags) })),
    total, page, pages: Math.ceil(total / limit) || 0,
  }
}

// 文章输入校验: 返回 { error } 或 null (通过)
export function validateArticleInput({ title, summary, content }) {
  const t = String(title || '').trim()
  if (!t) return { error: '标题不能为空' }
  if (t.length > 100) return { error: '标题不能超过 100 字' }
  if (summary && String(summary).length > 200) return { error: '摘要不能超过 200 字' }
  if (content && content.length > 100 * 1024) return { error: '正文过大 (≤100KB)' }
  return null
}

// 新建文章
export async function createArticle(data) {
  return prisma.article.create({
    data: {
      title: data.title,
      summary: data.summary || '',
      content: data.content || '',
      coverUrl: data.coverUrl || '',
      category: VALID_CATS.includes(data.category) ? data.category : 'study',
      tags: JSON.stringify(parseTags(data.tags)),
    },
  })
}

// 更新文章 (仅更新提供的字段)
export async function updateArticle(id, data) {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) return null
  const update = {}
  if (data.title !== undefined) update.title = data.title
  if (data.summary !== undefined) update.summary = data.summary
  if (data.content !== undefined) update.content = data.content
  if (data.coverUrl !== undefined) update.coverUrl = data.coverUrl
  if (data.category !== undefined && VALID_CATS.includes(data.category)) update.category = data.category
  if (data.tags !== undefined) update.tags = JSON.stringify(parseTags(data.tags))
  return prisma.article.update({ where: { id: n }, data: update })
}

// 删除单篇 (不存在返回 false, 不抛错)
export async function deleteArticle(id) {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) return false
  try {
    await prisma.article.delete({ where: { id: n } })
    return true
  } catch (e) {
    if (e.code === 'P2025') return false // 记录不存在
    throw e
  }
}

// 批量删除, 返回删除数 (单次最多 100 条, 路由层已 400 拦截, 此处 slice 兜底)
const MAX_BATCH_DELETE = 100
export async function deleteArticles(ids) {
  const validIds = ids.slice(0, MAX_BATCH_DELETE).map(Number).filter((n) => Number.isInteger(n) && n > 0)
  const result = await prisma.article.deleteMany({
    where: { id: { in: validIds } },
  })
  return result.count
}

// 仪表盘统计: 文章总数 + 最近 5 篇 (按更新时间倒序)
export async function getStats() {
  const [articleCount, recent] = await Promise.all([
    prisma.article.count(),
    prisma.article.findMany({
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])
  return { articleCount, recent }
}
