// Profile store: 公开资料 (首页侧栏 + 关于页)
import { defineStore } from 'pinia'
import { publicApi } from '../api/index.js'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchProfile(force = false) {
      if (this.profile && !force) return this.profile
      this.loading = true
      this.error = null
      try {
        this.profile = await publicApi.getProfile()
        return this.profile
      } catch (e) {
        this.error = e.message || '加载资料失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 后台编辑后刷新
    setProfile(data) {
      this.profile = data
    },
  },
})
