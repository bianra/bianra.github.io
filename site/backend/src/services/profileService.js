// Profile 服务: 读取单例资料, social JSON 解析为数组
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
    social,
  }
}

// 后台: 更新 profile 单例; social 数组序列化为 JSON 字符串
export async function updateProfile(data) {
  const update = {}
  if (data.name !== undefined) update.name = String(data.name).slice(0, 100)
  if (data.bio !== undefined) update.bio = String(data.bio)
  if (data.announcement !== undefined) update.announcement = String(data.announcement).slice(0, 200)
  if (data.avatarUrl !== undefined) update.avatarUrl = String(data.avatarUrl)
  if (data.social !== undefined) {
    // 过滤并限制最多 5 个社交链接
    const social = Array.isArray(data.social) ? data.social.slice(0, 5) : []
    update.social = JSON.stringify(social)
  }
  await prisma.profile.update({ where: { id: 1 }, data: update })
}
