// seed: 建 Admin (默认用户名 admin, 密码取 ADMIN_PASSWORD 或随机生成) + Profile 单例
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const prisma = new PrismaClient()

async function main() {
  // ===== Admin =====
  const username = 'admin'
  const existing = await prisma.admin.findFirst({ where: { username } })
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD || randomBytes(8).toString('hex')
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.admin.create({ data: { username, passwordHash } })
    console.log('✅ 已创建管理员账户:')
    console.log(`   用户名: ${username}`)
    console.log(`   密码  : ${password}`)
    if (!process.env.ADMIN_PASSWORD) {
      console.log('   (密码为随机生成, 请妥善保存; 也可用 ADMIN_PASSWORD 环境变量指定)')
    }
  } else {
    console.log('ℹ️  管理员账户已存在, 跳过创建')
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
