// 测试环境变量: 必须在 db.js (PrismaClient) 加载前设置 process.env
// Prisma 运行时会自动读 .env, 但 process.env 优先 —— 以此隔离 test.db 与 dev.db
// 此文件作为首个 setupFile, 先于 tests/setup.js 执行
process.env.DATABASE_URL = 'file:./test.db'
process.env.SESSION_SECRET = 'test-secret-xxx'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.NODE_ENV = 'test'
process.env.SITE_URL = 'https://bianra.com'
