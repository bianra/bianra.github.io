import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // dev 代理: 把 /api 和 /admin/api /uploads 转发到后端 3000 端口
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/admin/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
      '/robots.txt': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
