// seed: 建 Admin (用户名 bianra, 密码来自 ADMIN_PASSWORD 或随机生成) + Profile 单例
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ===== Admin =====
  const username = 'bianra'
  // 密码: 优先环境变量 ADMIN_PASSWORD; 留空则随机生成并打印一次
  const password = process.env.ADMIN_PASSWORD || randomBytes(6).toString('hex')
  const passwordHash = await bcrypt.hash(password, 10)

  // 已存在管理员则不重置密码 (避免每次 seed 覆盖真实密码)
  const existing = await prisma.admin.findFirst({ where: { username } })
  if (existing) {
    console.log(`✅ 管理员账户已存在 (${username}), 跳过创建/重置`)
  } else {
    await prisma.admin.create({ data: { username, passwordHash } })
    console.log('✅ 已创建管理员账户:')
    console.log(`   用户名: ${username}`)
    console.log(`   密码  : ${password}`)
    console.log('   (若未设置 ADMIN_PASSWORD, 该密码为随机生成, 仅显示这一次)')
  }

  // ===== Profile 单例 =====
  await prisma.profile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'bianra',
      bio: '',
      announcement: '',
      avatarUrl: '',
      social: '[]',
    },
  })
  console.log('✅ Profile 单例已就绪')
}

main()
  .catch((e) => {
    console.error('❌ seed 失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
