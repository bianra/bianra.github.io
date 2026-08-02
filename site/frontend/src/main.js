// 应用入口: 挂载 Pinia + Router + ThemeStore
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { router } from './router/index.js'
import { useThemeStore } from './stores/theme.js'
import { useAuthStore } from './stores/auth.js'
import './styles/tokens.css'
import './style.css'
// highlight.js 代码高亮主题 (适配全站深色模式)
import 'highlight.js/styles/github-dark.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 启动阶段: 主题初始化 + 监听 api:401 全局事件
const theme = useThemeStore()
theme.init()

// API 返回 401 → 自动清 auth 状态
window.addEventListener('api:401', () => {
  const auth = useAuthStore()
  auth.authenticated = false
  if (router.currentRoute.value.name?.startsWith?.('admin-')
      && router.currentRoute.value.name !== 'admin-login') {
    router.push({ name: 'admin-login' })
  }
})

app.mount('#app')
