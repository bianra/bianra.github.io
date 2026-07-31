// PrismaClient 单例
// node --watch 为整进程重启, 不会产生多实例; 此处保持简单直接实例化
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
