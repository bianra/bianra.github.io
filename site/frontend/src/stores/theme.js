// Theme store: 固定深色模式 (用户确认: 不做切换按钮, 不跟随系统)
// 全站恒为深色外观, 无切换逻辑
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'dark', // 固定深色
  }),

  actions: {
    // 启动时应用深色模式到 <html>
    init() {
      this.apply()
    },

    // 把深色模式应用到 <html>
    apply() {
      document.documentElement.classList.add('ks-dark')
    },
  },
})
