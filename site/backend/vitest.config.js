import { defineConfig } from 'vitest/config'

// 测试使用独立 PG schema (由 tests/env.js 注入 ?schema=test,
// process.env 优先于 .env, 不污染开发数据)
export default defineConfig({
  test: {
    environment: 'node',
    // 顺序重要: env.js 先设环境变量, setup.js 再 import db.js
    setupFiles: ['./tests/env.js', './tests/setup.js'],
    // 多个测试文件共享同一测试 schema, 禁止并行避免清表冲突
    fileParallelism: false,
    // 跨网络连 Neon, 清表 + 首次 db push 较慢; 放宽 hook/单测超时
    hookTimeout: 60000,
    testTimeout: 30000,
  },
})
