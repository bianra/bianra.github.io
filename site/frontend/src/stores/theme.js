// Theme store: 固定深色模式 (用户确认: 不做切换按钮, 不跟随系统)
// 保留 localStorage 兼容旧值, 但默认/兜底恒为 dark
import { defineStore } from 'pinia'

const STORAGE_KEY = 'bianra-theme'

function loadSavedMode() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' ? 'light' : 'dark'
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'dark', // 初始值稍后在 apply() 时覆盖
  }),

  actions: {
    // 启动时初始化: 读 localStorage → 默认深色 → 写 <html class>
    init() {
      this.mode = loadSavedMode()
      this.apply()
    },

    // 把当前 mode 应用到 <html>
    apply() {
      const html = document.documentElement
      if (this.mode === 'dark') html.classList.add('ks-dark')
      else html.classList.remove('ks-dark')
    },

    // 无切换按钮; 保留 toggle/setMode 仅供潜在扩展 (未被 UI 调用)
    toggle() {
      this.mode = this.mode === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, this.mode)
      this.apply()
    },

    setMode(m) {
      if (!['light', 'dark'].includes(m)) return
      this.mode = m
      localStorage.setItem(STORAGE_KEY, this.mode)
      this.apply()
    },
  },

  getters: {
    isDark: (s) => s.mode === 'dark',
  },
})
