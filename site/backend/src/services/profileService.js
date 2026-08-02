// Profile 服务: 读取单例资料, social JSON 解析为数组 (含背景图 bgUrl)
import { prisma } from '../db.js'

// 公开/后台通用: 返回结构化 profile (social 为数组)
export async function getProfile() {
  const p = await prisma.profile.findUnique({ where: { id: 1 } })
  if (!p) return null
  let social = []
  try {
    social = JSON.parse(p.social || '[]')
    if (!Array.isArray(social)) social = []
  } catch {
    social = []
  }
  return {
    name: p.name,
    bio: p.bio,
    announcement: p.announcement,
    avatarUrl: p.avatarUrl,
    bgUrl: p.bgUrl,
    artFont: p.artFont,
    social,
  }
}

// 后台: 更新 profile 单例; social 数组序列化为 JSON 字符串

// URL 安全校验: 仅允许 http(s) 或站内相对路径 (/uploads/...), 拒绝 javascript: 等危险协议
function isSafeUrl(value) {
  const s = String(value || '').trim()
  if (!s) return true // 空串允许 (清空)
  if (s.startsWith('/')) return true // 站内相对路径
  return /^https?:\/\//i.test(s)
}

export async function updateProfile(data) {
  const update = {}
  if (data.name !== undefined) update.name = String(data.name).slice(0, 100)
  if (data.bio !== undefined) update.bio = String(data.bio).slice(0, 2000)
  if (data.announcement !== undefined) update.announcement = String(data.announcement).slice(0, 200)
  if (data.avatarUrl !== undefined) {
    if (!isSafeUrl(data.avatarUrl)) {
      const err = new Error('头像地址不合法')
      err.status = 400
      throw err
    }
    update.avatarUrl = String(data.avatarUrl)
  }
  if (data.bgUrl !== undefined) {
    if (!isSafeUrl(data.bgUrl)) {
      const err = new Error('背景图地址不合法')
      err.status = 400
      throw err
    }
    update.bgUrl = String(data.bgUrl)
  }
  if (data.artFont !== undefined) {
    // 字体白名单: 仅允许前端字体库中存在的标识
    const VALID_FONTS = ['lobster', 'great-vibes', 'pacifico', 'dancing-script', 'caveat']
    if (!VALID_FONTS.includes(String(data.artFont))) {
      const err = new Error('不支持的字体')
      err.status = 400
      throw err
    }
    update.artFont = String(data.artFont)
  }
  if (data.social !== undefined) {
    // 过滤并限制最多 5 个社交链接; 每个须有 label + 合法 url
    const social = Array.isArray(data.social)
      ? data.social
          .slice(0, 5)
          .filter((s) => s && typeof s === 'object' && isSafeUrl(s.url))
          .map((s) => ({
            label: String(s.label || '').slice(0, 50),
            url: String(s.url || '').trim(),
          }))
      : []
    update.social = JSON.stringify(social)
  }
  await prisma.profile.update({ where: { id: 1 }, data: update })
}
