import { defineConfig } from 'vitest/config'

// 测试使用独立 test.db (由 tests/env.js 在 PrismaClient 加载前注入 process.env,
// process.env 优先于 .env, 不污染 dev.db)
export default defineConfig({
  test: {
    environment: 'node',
    // 顺序重要: env.js 先设环境变量, setup.js 再 import db.js
    setupFiles: ['./tests/env.js', './tests/setup.js'],
    // 多个测试文件共享同一 test.db, 禁止并行避免清表冲突
    fileParallelism: false,
  },
})
