// 公开路由: /api/profile /api/articles /api/articles/:id /api/feed.xml
import { Router } from 'express'

import { getProfile } from '../services/profileService.js'
import { listArticles, getArticleById, getCategoryCounts, getTagCloud } from '../services/articleService.js'
import { buildRssXml } from '../services/rssService.js'

export const publicRouter = Router()

// GET /api/profile
publicRouter.get('/profile', async (req, res, next) => {
  try {
    const profile = await getProfile()
    if (!profile) return res.status(404).json({ error: '资料不存在' })
    res.json(profile)
  } catch (e) {
    next(e)
  }
})

// GET /api/category-counts (各分类文章数)
publicRouter.get('/category-counts', async (req, res, next) => {
  try {
    res.json(await getCategoryCounts())
  } catch (e) {
    next(e)
  }
})

// GET /api/tag-cloud (标签云: 文章标签统计)
publicRouter.get('/tag-cloud', async (req, res, next) => {
  try {
    res.json(await getTagCloud())
  } catch (e) {
    next(e)
  }
})

// GET /api/articles?page=&limit=
publicRouter.get('/articles', async (req, res, next) => {
  try {
    res.json(await listArticles(req.query))
  } catch (e) {
    next(e)
  }
})

// GET /api/articles/:id
publicRouter.get('/articles/:id', async (req, res, next) => {
  try {
    const article = await getArticleById(req.params.id)
    if (!article) return res.status(404).json({ error: '文章不存在' })
    res.json(article)
  } catch (e) {
    next(e)
  }
})

// GET /api/feed.xml (RSS 2.0)
publicRouter.get('/feed.xml', async (req, res, next) => {
  try {
    const xml = await buildRssXml()
    res.type('application/xml').send(xml)
  } catch (e) {
    next(e)
  }
})
