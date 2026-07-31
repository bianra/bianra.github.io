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
