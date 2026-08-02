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

// 字体库: 标识 → 字体栈 (与 tokens.css @font-face 对应)
export const ART_FONTS = {
  lobster:        { label: 'Lobster · 粗壮招牌', font: "'Lobster Local', 'Segoe Script', cursive" },
  'great-vibes':  { label: 'Great Vibes · 优雅花体', font: "'Great Vibes Local', 'Segoe Script', cursive" },
  pacifico:       { label: 'Pacifico · 圆润手写', font: "'Pacifico Local', 'Segoe Script', cursive" },
  'dancing-script': { label: 'Dancing Script · 灵动连笔', font: "'Dancing Script Local', 'Segoe Script', cursive" },
  caveat:         { label: 'Caveat · 自然手写', font: "'Caveat Local', 'Segoe Script', cursive" },
}

// 把封页艺术字字体应用到 :root 的 --font-art CSS 变量
function applyArtFont(fontKey) {
  const root = document.documentElement
  const f = ART_FONTS[fontKey]
  if (f) {
    root.style.setProperty('--font-art', f.font)
  } else {
    root.style.removeProperty('--font-art') // 回退 tokens.css 默认
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
        // 应用封页艺术字字体
        applyArtFont(this.profile?.artFont)
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
      applyArtFont(data?.artFont)
    },
  },
})
