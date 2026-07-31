// Auth store: 后台登录状态 (check-auth 校验 / 登出)
import { defineStore } from 'pinia'
import { adminApi } from '../api/index.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    authenticated: false,
    checking: true, // 首次路由进入前保持 true, 避免闪跳
  }),

  actions: {
    // 进入 /admin/* 前调用, 判断是否登录
    async checkAuth() {
      this.checking = true
      try {
        const data = await adminApi.checkAuth()
        this.authenticated = !!data?.authenticated
      } catch {
        this.authenticated = false
      } finally {
        this.checking = false
      }
      return this.authenticated
    },

    async login(username, password) {
      const res = await adminApi.login({ username, password })
      if (res?.ok) {
        this.authenticated = true
      }
      return res
    },

    async logout() {
      try { await adminApi.logout() } catch { /* 忽略 */ }
      this.authenticated = false
    },
  },
})
