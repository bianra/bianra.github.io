// Theme store: 深色/浅色模式切换 + localStorage 持久化
import { defineStore } from 'pinia'

const STORAGE_KEY = 'bianra-theme'
const MODES = ['light', 'dark']

function loadSavedMode() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (MODES.includes(saved)) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'light', // 初始值稍后在 apply() 时覆盖
  }),

  actions: {
    // 启动时初始化: 读 localStorage → 无则跟随系统 → 写 <html class>
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

    // 切换模式
    toggle() {
      this.mode = this.mode === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, this.mode)
      this.apply()
    },

    setMode(m) {
      if (!MODES.includes(m)) return
      this.mode = m
      localStorage.setItem(STORAGE_KEY, this.mode)
      this.apply()
    },
  },

  getters: {
    isDark: (s) => s.mode === 'dark',
  },
})
