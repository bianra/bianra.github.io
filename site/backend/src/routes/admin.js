// 后台路由: /admin/api/*
// login 无需鉴权; 其余接口经 requireAdmin 保护 (401 → { error: '未登录' })
import { Router } from 'express'

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
} from '../services/articleService.js'
import { getProfile, updateProfile } from '../services/profileService.js'
import { saveImage } from '../services/fileService.js'

export const adminRouter = Router()

// ===== 登录 (无需鉴权) =====
adminRouter.post('/login', async (req, res, next) => {
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
    if (!t) return res.status(400).json({ error: '标题不能为空' })
    if (t.length > 100) return res.status(400).json({ error: '标题不能超过 100 字' })
    if (summary && String(summary).length > 200) {
      return res.status(400).json({ error: '摘要不能超过 200 字' })
    }
    if (content && content.length > 100 * 1024) {
      return res.status(400).json({ error: '正文过大 (≤100KB)' })
    }
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
    if (!t) return res.status(400).json({ error: '标题不能为空' })
    if (t.length > 100) return res.status(400).json({ error: '标题不能超过 100 字' })
    if (summary && String(summary).length > 200) {
      return res.status(400).json({ error: '摘要不能超过 200 字' })
    }
    if (content && content.length > 100 * 1024) {
      return res.status(400).json({ error: '正文过大 (≤100KB)' })
    }
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
