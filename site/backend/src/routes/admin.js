// 后台路由: /admin/api/*
// login 无需鉴权; 其余接口经 requireAdmin 保护 (401 → { error: '未登录' })
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'

import { requireAdmin } from '../middleware/requireAdmin.js'
import { upload } from '../middleware/upload.js'
import { login, changePassword } from '../services/authService.js'
import {
  listArticlesAdmin,
  createArticle,
  updateArticle,
  deleteArticle,
  deleteArticles,
  getArticleById,
  getStats,
  validateArticleInput,
} from '../services/articleService.js'
import { getProfile, updateProfile } from '../services/profileService.js'
import { saveImage } from '../services/fileService.js'

export const adminRouter = Router()

// ===== 登录 (无需鉴权, 但按 IP 限流防爆破) =====
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟窗口
  limit: 20,                // 每个 IP 最多 20 次尝试
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '尝试次数过多, 请 15 分钟后再试' },
  // 测试环境跳过限流(集成测试大量登录), 生产/开发正常生效
  skip: () => process.env.NODE_ENV === 'test',
})

adminRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    const result = await login(username, password)
    if (!result.ok) return res.status(401).json({ error: '用户名或密码错误' })
    // 登录成功后重建 session id, 防会话固定攻击
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()))
    })
    req.session.isAdmin = true
    req.session.adminId = result.admin.id
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// ===== 以下全部需要登录 =====
adminRouter.use(requireAdmin)

adminRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {})
  res.clearCookie('bianra.sid')
  res.json({ ok: true })
})

adminRouter.get('/check-auth', (req, res) => {
  res.json({ authenticated: true })
})

// 仪表盘统计
adminRouter.get('/stats', async (req, res, next) => {
  try {
    res.json(await getStats())
  } catch (e) {
    next(e)
  }
})

// 文章列表 (标题模糊搜索 + 分页)
adminRouter.get('/articles', async (req, res, next) => {
  try {
    res.json(await listArticlesAdmin(req.query))
  } catch (e) {
    next(e)
  }
})

// 新建文章
adminRouter.post('/articles', async (req, res, next) => {
  try {
    const { title, summary, content, coverUrl, category, tags } = req.body || {}
    const t = String(title || '').trim()
    const invalid = validateArticleInput({ title: t, summary, content })
    if (invalid) return res.status(400).json(invalid)
    const a = await createArticle({ title: t, summary, content, coverUrl, category, tags })
    res.status(201).json({ id: a.id, title: a.title })
  } catch (e) {
    next(e)
  }
})

// 编辑文章
adminRouter.put('/articles/:id', async (req, res, next) => {
  try {
    const { title, summary, content, coverUrl, category, tags } = req.body || {}
    const t = String(title || '').trim()
    const invalid = validateArticleInput({ title: t, summary, content })
    if (invalid) return res.status(400).json(invalid)
    const existing = await getArticleById(req.params.id)
    if (!existing) return res.status(404).json({ error: '文章不存在' })
    const a = await updateArticle(req.params.id, { title: t, summary, content, coverUrl, category, tags })
    res.json({ id: a.id, title: a.title })
  } catch (e) {
    next(e)
  }
})

// 删除单篇
adminRouter.delete('/articles/:id', async (req, res, next) => {
  try {
    const ok = await deleteArticle(req.params.id)
    if (!ok) return res.status(404).json({ error: '文章不存在' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// 批量删除
adminRouter.delete('/articles', async (req, res, next) => {
  try {
    const { ids } = req.body || {}
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids 必须是数组' })
    }
    if (ids.length > 100) {
      return res.status(400).json({ error: '单次最多删除 100 篇' })
    }
    const deleted = await deleteArticles(ids)
    res.json({ deleted })
  } catch (e) {
    next(e)
  }
})

// 图片上传 (multipart, 字段名 file)
adminRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' })
    const url = await saveImage(req.file.buffer)
    res.status(201).json({ url })
  } catch (e) {
    next(e)
  }
})

// 设置: 读
adminRouter.get('/settings', async (req, res, next) => {
  try {
    res.json(await getProfile())
  } catch (e) {
    next(e)
  }
})

// 设置: 写
adminRouter.put('/settings', async (req, res, next) => {
  try {
    const { name, bio, announcement, avatarUrl, bgUrl, artFont, social } = req.body || {}
    await updateProfile({ name, bio, announcement, avatarUrl, bgUrl, artFont, social })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

// 改密码
adminRouter.put('/settings/password', async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body || {}
    await changePassword(req.session.adminId, oldPassword, newPassword)
    res.json({ ok: true })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

// ===== 知识 Agent(对话 / 审核台) =====
// 浏览器不直连知识 Agent(:8787), 经后端同机转发, 避免暴露内网端口
const AGENT_BASE = process.env.AGENT_BASE_URL || 'http://127.0.0.1:8787/v1'
const AGENT_TOKEN = process.env.AGENT_AUTH_TOKEN || ''

async function proxyAgent(req, res, method, agentPath, body) {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (AGENT_TOKEN) headers['X-API-Token'] = AGENT_TOKEN
    const r = await fetch(`${AGENT_BASE}${agentPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(120000), // LLM 生成可能较慢
    })
    const data = await r.json()
    res.status(r.ok ? 200 : 502).json(data)
  } catch (e) {
    res.status(502).json({ ok: false, reason: '知识 Agent 未运行: ' + (e.message || e) })
  }
}

// 草稿列表(按状态过滤)
adminRouter.get('/agent/drafts', (req, res) => {
  const status = req.query.status ? `?status=${encodeURIComponent(req.query.status)}` : ''
  proxyAgent(req, res, 'GET', `/drafts${status}`)
})

// 草稿详情(含正文)
adminRouter.get('/agent/draft/:id', (req, res) => {
  proxyAgent(req, res, 'GET', `/draft/${encodeURIComponent(req.params.id)}`)
})

// 检索问答
adminRouter.get('/agent/ask', (req, res) => {
  proxyAgent(req, res, 'GET', `/ask?query=${encodeURIComponent(req.query.query || '')}`)
})

// 审核动作: 意见 / 通过 / 驳回 / 入库
adminRouter.post('/agent/feedback', (req, res) => {
  proxyAgent(req, res, 'POST', `/draft/${encodeURIComponent(req.body.draft_id)}/feedback`, { opinion: req.body.opinion })
})
adminRouter.post('/agent/approve', (req, res) => {
  proxyAgent(req, res, 'POST', `/draft/${encodeURIComponent(req.body.draft_id)}/approve`)
})
adminRouter.post('/agent/reject', (req, res) => {
  proxyAgent(req, res, 'POST', `/draft/${encodeURIComponent(req.body.draft_id)}/reject`)
})
adminRouter.post('/agent/publish', (req, res) => {
  proxyAgent(req, res, 'POST', `/draft/${encodeURIComponent(req.body.draft_id)}/publish`)
})

// 触发总结(日志→草稿)
adminRouter.get('/agent/notes', (req, res) => {
  proxyAgent(req, res, 'GET', '/notes')
})
adminRouter.post('/agent/merge', (req, res) => {
  proxyAgent(req, res, 'POST', '/merge', { note_ids: req.body.note_ids, topics: req.body.topics })
})
adminRouter.post('/agent/tree', (req, res) => {
  proxyAgent(req, res, 'POST', '/tree', { note_ids: req.body.note_ids, topics: req.body.topics })
})
adminRouter.post('/agent/summarize', (req, res) => {
  proxyAgent(req, res, 'POST', '/summarize', {
    topic: req.body.topic || '',
    limit: req.body.limit || 20,
    text: req.body.text || undefined,
  })
})
