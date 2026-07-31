// 鉴权服务: 登录 (bcrypt + 失败延迟) / 改密码
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'

// 失败计数 (内存 Map, 同一用户名失败 5 次后延迟 5s, 防爆破)
const failCount = new Map()
const MAX_FAIL = 5
const DELAY_MS = 5000

// 登录: 成功返回 { ok, admin }, 失败返回 { ok: false }
export async function login(username, password) {
  const key = String(username || '').toLowerCase()
  const count = failCount.get(key) || 0
  if (count >= MAX_FAIL) {
    // 已多次失败, 强制延迟, 不区分用户名是否存在
    await new Promise((r) => setTimeout(r, DELAY_MS))
  }
  const admin = await prisma.admin.findFirst({ where: { username: username || '' } })
  if (!admin || !(await bcrypt.compare(password || '', admin.passwordHash))) {
    failCount.set(key, count + 1)
    return { ok: false }
  }
  failCount.delete(key)
  return { ok: true, admin }
}

// 改密码: 校验旧密码 + 新密码长度, 抛错带 status
export async function changePassword(adminId, oldPassword, newPassword) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } })
  if (!admin || !(await bcrypt.compare(oldPassword || '', admin.passwordHash))) {
    const err = new Error('旧密码错误')
    err.status = 400
    throw err
  }
  if (!newPassword || newPassword.length < 6) {
    const err = new Error('新密码至少 6 位')
    err.status = 400
    throw err
  }
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.admin.update({ where: { id: adminId }, data: { passwordHash } })
}
