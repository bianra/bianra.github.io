// PrismaClient 单例
// (dev 模式 node --watch 重载时避免创建过多连接)
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
