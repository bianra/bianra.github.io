// 后台 API 集成测试 (supertest + vitest)
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { resetDb, createArticle, createAdmin } from './setup.js'

const app = createApp()
const TEST_USER = 'admin'
const TEST_PASS = 'test123456'

// 登录并返回带 session cookie 的 agent
async function loginAgent() {
  const agent = request.agent(app)
  await agent.post('/admin/api/login').send({ username: TEST_USER, password: TEST_PASS })
  return agent
}

// 最小合法 PNG (1x1, file-type 可识别魔数 \x89PNG)
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)
// SVG 文本 (file-type 无法识别, 被拒)
const SVG_BUFFER = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>')

describe('后台 API', () => {
  beforeEach(async () => {
    await resetDb()
    await createAdmin(TEST_USER, TEST_PASS)
  })

  // ===== 鉴权 =====
  describe('鉴权', () => {
    it('未登录访问受保护接口返回 401', async () => {
      const res = await request(app).get('/admin/api/check-auth')
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('未登录')
    })

    it('登录成功返回 ok', async () => {
      const res = await request(app)
        .post('/admin/api/login')
        .send({ username: TEST_USER, password: TEST_PASS })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('密码错误返回 401', async () => {
      const res = await request(app)
        .post('/admin/api/login')
        .send({ username: TEST_USER, password: 'wrong' })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('用户名或密码错误')
    })

    it('登录后可访问受保护接口', async () => {
      const agent = await loginAgent()
      const res = await agent.get('/admin/api/check-auth')
      expect(res.status).toBe(200)
      expect(res.body.authenticated).toBe(true)
    })

    it('logout 后失去访问权限', async () => {
      const agent = await loginAgent()
      await agent.post('/admin/api/logout')
      const res = await agent.get('/admin/api/check-auth')
      expect(res.status).toBe(401)
    })
  })

  // ===== 仪表盘统计 =====
  describe('GET /admin/api/stats', () => {
    it('返回文章数和最近 5 篇', async () => {
      await createArticle({ title: 'A' })
      await createArticle({ title: 'B' })
      const agent = await loginAgent()
      const res = await agent.get('/admin/api/stats')
      expect(res.status).toBe(200)
      expect(res.body.articleCount).toBe(2)
      expect(res.body.recent).toHaveLength(2)
      expect(res.body.recent[0]).toHaveProperty('title')
    })

    it('无文章时返回空列表', async () => {
      const agent = await loginAgent()
      const res = await agent.get('/admin/api/stats')
      expect(res.body.articleCount).toBe(0)
      expect(res.body.recent).toHaveLength(0)
    })
  })

  // ===== 文章 CRUD =====
  describe('文章 CRUD', () => {
    it('列表含搜索和分页, 不含 content', async () => {
      await createArticle({ title: 'Vue 入门' })
      await createArticle({ title: 'React 入门' })
      await createArticle({ title: 'Node.js' })
      const agent = await loginAgent()
      const res = await agent.get('/admin/api/articles?q=入门&page=1&limit=10')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(2)
      expect(res.body.total).toBe(2)
      expect(res.body.items[0]).not.toHaveProperty('content')
    })

    it('新建文章成功', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/articles').send({
        title: '新文章',
        summary: '摘要',
        content: '# 正文',
        coverUrl: '',
      })
      expect(res.status).toBe(201)
      expect(res.body.id).toBeDefined()
      expect(res.body.title).toBe('新文章')
    })

    it('新建标题为空返回 400', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/articles').send({ title: '' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('标题不能为空')
    })

    it('新建标题超 100 字返回 400', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/articles').send({ title: 'x'.repeat(101) })
      expect(res.status).toBe(400)
    })

    it('编辑文章', async () => {
      const a = await createArticle({ title: '旧标题' })
      const agent = await loginAgent()
      const res = await agent.put(`/admin/api/articles/${a.id}`).send({ title: '新标题' })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('新标题')
    })

    it('新建文章带 category 保存', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/articles').send({
        title: '学习笔记', category: 'study', content: 'x',
      })
      expect(res.status).toBe(201)
      const detail = await request(app).get(`/api/articles/${res.body.id}`)
      expect(detail.body.category).toBe('study')
    })

    it('非法 category 回退 study', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/articles').send({
        title: '怪分类', category: 'hacker', content: 'x',
      })
      expect(res.status).toBe(201)
      const detail = await request(app).get(`/api/articles/${res.body.id}`)
      expect(detail.body.category).toBe('study')
    })

    it('编辑文章可更新 category', async () => {
      const a = await createArticle({ title: '换分类', category: 'study' })
      const agent = await loginAgent()
      await agent.put(`/admin/api/articles/${a.id}`).send({ title: '换分类', category: 'code' })
      const detail = await request(app).get(`/api/articles/${a.id}`)
      expect(detail.body.category).toBe('code')
      expect(detail.body.title).toBe('换分类')
    })

    it('编辑标题超 100 字返回 400', async () => {
      const a = await createArticle({ title: '原始标题' })
      const agent = await loginAgent()
      const res = await agent.put(`/admin/api/articles/${a.id}`).send({ title: 'x'.repeat(101) })
      expect(res.status).toBe(400)
    })

    it('新建摘要超 200 字返回 400', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/articles').send({
        title: '长摘要', summary: 'x'.repeat(201), content: 'y',
      })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('摘要不能超过 200 字')
    })

    it('编辑不存在返回 404', async () => {
      const agent = await loginAgent()
      const res = await agent.put('/admin/api/articles/9999').send({ title: 'x' })
      expect(res.status).toBe(404)
    })

    it('删除单篇', async () => {
      const a = await createArticle({ title: '待删' })
      const agent = await loginAgent()
      const res = await agent.delete(`/admin/api/articles/${a.id}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('删除不存在返回 404', async () => {
      const agent = await loginAgent()
      const res = await agent.delete('/admin/api/articles/9999')
      expect(res.status).toBe(404)
    })

    it('批量删除', async () => {
      const a1 = await createArticle({ title: 'A' })
      const a2 = await createArticle({ title: 'B' })
      const agent = await loginAgent()
      const res = await agent.delete('/admin/api/articles').send({ ids: [a1.id, a2.id] })
      expect(res.status).toBe(200)
      expect(res.body.deleted).toBe(2)
    })

    it('批量删除 ids 非数组返回 400', async () => {
      const agent = await loginAgent()
      const res = await agent.delete('/admin/api/articles').send({ ids: 'not-array' })
      expect(res.status).toBe(400)
    })
  })

  // ===== 上传 =====
  describe('上传', () => {
    it('合法 PNG 上传成功', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/upload').attach('file', PNG_BUFFER, 'test.png')
      expect(res.status).toBe(201)
      expect(res.body.url).toMatch(/^\/uploads\/\d+$/)
    })

    it('上传后可经 /uploads/:id 读取', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/upload').attach('file', PNG_BUFFER, 'test.png')
      expect(res.status).toBe(201)
      const getRes = await request(app).get(res.body.url)
      expect(getRes.status).toBe(200)
      expect(getRes.headers['content-type']).toContain('image/png')
    })

    it('SVG 被拒 (魔数不匹配)', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/upload').attach('file', SVG_BUFFER, 'evil.svg')
      expect(res.status).toBe(400)
    })

    it('未上传文件返回 400', async () => {
      const agent = await loginAgent()
      const res = await agent.post('/admin/api/upload')
      expect(res.status).toBe(400)
    })

    it('超 5MB 文件被拒', async () => {
      const agent = await loginAgent()
      const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0x89) // 超限
      const res = await agent.post('/admin/api/upload').attach('file', big, 'big.bin')
      expect(res.status).toBe(400)
    })

    it('伪造扩展名的非图片被拒 (魔数校验)', async () => {
      const agent = await loginAgent()
      // 内容不是图片, 但伪装成 .png
      const fake = Buffer.from('not really a png at all')
      const res = await agent.post('/admin/api/upload').attach('file', fake, 'fake.png')
      expect(res.status).toBe(400)
    })
  })

  // ===== 设置 =====
  describe('设置', () => {
    it('读取设置', async () => {
      const agent = await loginAgent()
      const res = await agent.get('/admin/api/settings')
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('bianra')
      expect(Array.isArray(res.body.social)).toBe(true)
    })

    it('更新设置并验证', async () => {
      const agent = await loginAgent()
      const res = await agent.put('/admin/api/settings').send({
        name: '新名字',
        bio: '新简介',
        announcement: '新公告',
        avatarUrl: '/uploads/test.png',
        social: [{ label: 'GitHub', url: 'https://github.com/test' }],
      })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)

      // 读回验证
      const res2 = await agent.get('/admin/api/settings')
      expect(res2.body.name).toBe('新名字')
      expect(res2.body.bio).toBe('新简介')
      expect(res2.body.announcement).toBe('新公告')
      expect(res2.body.social[0].label).toBe('GitHub')
    })

    it('更新设置支持 bgUrl 并读回', async () => {
      const agent = await loginAgent()
      await agent.put('/admin/api/settings').send({ bgUrl: '/uploads/202608/bg.jpg' })
      const res = await agent.get('/admin/api/settings')
      expect(res.status).toBe(200)
      expect(res.body.bgUrl).toBe('/uploads/202608/bg.jpg')
    })

    it('更新设置支持 artFont 并读回', async () => {
      const agent = await loginAgent()
      await agent.put('/admin/api/settings').send({ artFont: 'pacifico' })
      const res = await agent.get('/admin/api/settings')
      expect(res.status).toBe(200)
      expect(res.body.artFont).toBe('pacifico')
    })

    it('非法 artFont 返回 400', async () => {
      const agent = await loginAgent()
      const res = await agent.put('/admin/api/settings').send({ artFont: 'comic-sans-ms' })
      expect(res.status).toBe(400)
    })

    it('social 含 javascript: 协议的链接被过滤', async () => {
      const agent = await loginAgent()
      await agent.put('/admin/api/settings').send({
        social: [
          { label: '正常', url: 'https://github.com/x' },
          { label: '危险', url: 'javascript:alert(1)' },
        ],
      })
      const res = await agent.get('/admin/api/settings')
      expect(res.body.social).toHaveLength(1)
      expect(res.body.social[0].label).toBe('正常')
    })

    it('avatarUrl 含 javascript: 协议返回 400', async () => {
      const agent = await loginAgent()
      const res = await agent.put('/admin/api/settings').send({ avatarUrl: 'javascript:alert(1)' })
      expect(res.status).toBe(400)
    })
  })

  // ===== 改密码 =====
  describe('改密码', () => {
    it('旧密码错误返回 400', async () => {
      const agent = await loginAgent()
      const res = await agent.put('/admin/api/settings/password').send({
        oldPassword: 'wrong',
        newPassword: 'newpass123',
      })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('旧密码错误')
    })

    it('新密码 <6 位返回 400', async () => {
      const agent = await loginAgent()
      const res = await agent.put('/admin/api/settings/password').send({
        oldPassword: TEST_PASS,
        newPassword: '123',
      })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('新密码至少 6 位')
    })

    it('成功改密码后可用新密码登录', async () => {
      const agent = await loginAgent()
      const res = await agent.put('/admin/api/settings/password').send({
        oldPassword: TEST_PASS,
        newPassword: 'newpass123',
      })
      expect(res.status).toBe(200)

      // 旧密码应失败
      const oldRes = await request(app)
        .post('/admin/api/login')
        .send({ username: TEST_USER, password: TEST_PASS })
      expect(oldRes.status).toBe(401)

      // 新密码应成功
      const newRes = await request(app)
        .post('/admin/api/login')
        .send({ username: TEST_USER, password: 'newpass123' })
      expect(newRes.status).toBe(200)
      expect(newRes.body.ok).toBe(true)
    })
  })
})
