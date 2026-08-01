// Profile store: 公开资料 (首页侧栏 + 关于页)
import { defineStore } from 'pinia'
import { publicApi } from '../api/index.js'

// 把背景图应用到 :root 的 --bg-image CSS 变量
// 有值 → url('...'); 空值 → 移除自定义, 回退到 tokens.css 默认紫黑渐变
function applyBgImage(bgUrl) {
  const root = document.documentElement
  if (bgUrl) {
    root.style.setProperty('--bg-image', `url('${bgUrl}')`)
  } else {
    root.style.removeProperty('--bg-image')
  }
}

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
        // 应用全站背景图 (含后台页面)
        applyBgImage(this.profile?.bgUrl)
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
      applyBgImage(data?.bgUrl)
    },
  },
})
