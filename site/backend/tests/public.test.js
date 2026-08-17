// 公开 API 集成测试 (supertest + vitest)
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { resetDb, createArticle } from './setup.js'

let app
beforeAll(async () => {
  app = await createApp()
})

describe('公开 API', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /health', () => {
    it('返回 ok 且 db 已连接', async () => {
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.db).toBe('connected')
    })
  })

  describe('GET /api/profile', () => {
    it('返回 profile, social 为数组', async () => {
      const res = await request(app).get('/api/profile')
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('bianra')
      expect(res.body.bio).toBe('关于我')
      expect(res.body.announcement).toBe('欢迎')
      expect(Array.isArray(res.body.social)).toBe(true)
      expect(res.body.social[0]).toMatchObject({
        label: 'GitHub',
        url: 'https://github.com/xxx',
      })
    })
  })

  describe('GET /api/articles', () => {
    it('分页返回列表, 不含 content', async () => {
      await createArticle({ title: 'A' })
      await createArticle({ title: 'B' })
      const res = await request(app).get('/api/articles?page=1&limit=6')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(2)
      expect(res.body.items[0]).not.toHaveProperty('content')
      expect(res.body.total).toBe(2)
      expect(res.body.page).toBe(1)
      expect(res.body.pages).toBe(1)
    })

    it('按创建时间倒序', async () => {
      await createArticle({ title: '旧' })
      await new Promise((r) => setTimeout(r, 60))
      await createArticle({ title: '新' })
      const res = await request(app).get('/api/articles')
      expect(res.body.items[0].title).toBe('新')
      expect(res.body.items[1].title).toBe('旧')
    })

    it('limit 上限裁剪到 100', async () => {
      const res = await request(app).get('/api/articles?limit=9999')
      expect(res.status).toBe(200)
    })

    it('page 超出总页数时返回空列表', async () => {
      await createArticle({ title: '唯一' })
      const res = await request(app).get('/api/articles?page=999')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(0)
      expect(res.body.total).toBe(1)
      expect(res.body.pages).toBe(1)
    })

    it('cat 参数按分类筛选', async () => {
      await createArticle({ title: '学习篇', category: 'study' })
      await createArticle({ title: '代码篇', category: 'code' })
      const res = await request(app).get('/api/articles?cat=study')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].title).toBe('学习篇')
      expect(res.body.items[0].category).toBe('study')
      expect(res.body.total).toBe(1)
    })

    it('新增闲谈分类可筛选', async () => {
      await createArticle({ title: '闲聊一篇', category: 'chat' })
      const res = await request(app).get('/api/articles?cat=chat')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].category).toBe('chat')
    })

    it('非法 cat 参数回退为全部', async () => {
      await createArticle({ title: '任意', category: 'study' })
      const res = await request(app).get('/api/articles?cat=hacker')
      expect(res.status).toBe(200)
      expect(res.body.total).toBe(1)
    })

    it('q 参数按标题模糊搜索', async () => {
      await createArticle({ title: '服务器安全日报' })
      await createArticle({ title: '生活随笔' })
      const res = await request(app).get('/api/articles?q=安全')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].title).toBe('服务器安全日报')
      expect(res.body.total).toBe(1)
    })

    it('q 与 cat 组合筛选', async () => {
      await createArticle({ title: 'React 学习', category: 'study' })
      await createArticle({ title: 'React 代码', category: 'code' })
      const res = await request(app).get('/api/articles?cat=study&q=React')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].title).toBe('React 学习')
    })

    it('q 搜索正文内容', async () => {
      await createArticle({ title: '标题无关键词', content: '# 这里提到 PostgreSQL 优化技巧' })
      const res = await request(app).get('/api/articles?q=PostgreSQL')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].title).toBe('标题无关键词')
    })

    it('tag 参数按标签筛选', async () => {
      await createArticle({ title: '带标签', tags: ['vue', '前端'] })
      await createArticle({ title: '无标签' })
      const res = await request(app).get('/api/articles?tag=vue')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].title).toBe('带标签')
    })

    it('列表返回 tags 数组', async () => {
      await createArticle({ title: '标签文', tags: ['a', 'b'] })
      const res = await request(app).get('/api/articles')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.items[0].tags)).toBe(true)
      expect(res.body.items[0].tags).toContain('a')
    })

    it('tag-cloud 返回标签统计', async () => {
      await createArticle({ title: 'x1', tags: ['vue', '日记'] })
      await createArticle({ title: 'x2', tags: ['vue'] })
      const res = await request(app).get('/api/tag-cloud')
      expect(res.status).toBe(200)
      const vue = res.body.find((t) => t.name === 'vue')
      expect(vue).toBeDefined()
      expect(vue.count).toBe(2)
    })
  })

  describe('GET /api/articles/:id', () => {
    it('返回详情, 含 content', async () => {
      const a = await createArticle({ title: '详情', content: '# Hi' })
      const res = await request(app).get(`/api/articles/${a.id}`)
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('详情')
      expect(res.body.content).toBe('# Hi')
    })

    it('不存在返回 404', async () => {
      const res = await request(app).get('/api/articles/9999')
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('文章不存在')
    })

    it('非法 id 返回 404', async () => {
      const res = await request(app).get('/api/articles/abc')
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/feed.xml', () => {
    it('返回 RSS 2.0 XML, 含文章', async () => {
      await createArticle({ title: 'RSS 测试', summary: '提要' })
      const res = await request(app).get('/api/feed.xml')
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toMatch(/xml/)
      expect(res.text).toContain('<rss version="2.0"')
      expect(res.text).toContain('<channel>')
      expect(res.text).toContain('RSS 测试')
      expect(res.text).toContain('/post/')
    })

    it('无文章时返回空 channel (无 item)', async () => {
      const res = await request(app).get('/api/feed.xml')
      expect(res.status).toBe(200)
      expect(res.text).toContain('<channel>')
      expect(res.text).not.toContain('<item>')
    })
  })

  describe('GET /robots.txt', () => {
    it('返回 robots, 禁止 /admin/', async () => {
      const res = await request(app).get('/robots.txt')
      expect(res.status).toBe(200)
      expect(res.text).toContain('Disallow: /admin/')
      expect(res.text).toContain('Disallow: /api/')
    })
  })
})
