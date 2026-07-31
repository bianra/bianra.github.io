// 入口: 加载 .env → createApp → listen
// dotenv/config 必须最先导入, 使环境变量在 config.js 读取前生效
import 'dotenv/config'
import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './db.js'

const app = createApp()

const server = app.listen(config.port, () => {
  console.log(`🚀 bianra 后端已启动: http://localhost:${config.port} (${config.nodeEnv})`)
})

// 优雅关闭
async function shutdown(signal) {
  console.log(`\n收到 ${signal}, 正在关闭...`)
  await prisma.$disconnect()
  server.close(() => {
    console.log('已关闭')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
