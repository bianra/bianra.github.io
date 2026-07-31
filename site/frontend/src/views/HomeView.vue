<script setup>
// 主页: HeroSection + MainGrid (ProfileSidebar + ArticleFeed)
import { onMounted, ref } from 'vue'
import { useProfileStore } from '../stores/profile.js'

const profileStore = useProfileStore()
const articles = ref([])
const loading = ref(true)

onMounted(async () => {
  await profileStore.fetchProfile()
  loading.value = false
})
</script>

<template>
  <div class="home-view">
    <!-- Hero 封面 (阶段 5 细化) -->
    <section
      id="hero"
      class="hero-section glass-panel"
      style="min-height:92vh;margin:20px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px;text-align:center;"
    >
      <h1 style="font-size:var(--fs-hero);letter-spacing:-0.04em;background:linear-gradient(135deg,var(--accent),var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1;">bianra</h1>
      <p style="font-size:var(--fs-lg);color:var(--ink-2);">一个手写的个人小站 · 阶段四骨架</p>
      <a href="#content" class="btn-primary" style="margin-top:24px;">查看文章 ↓</a>
    </section>

    <!-- 双栏主区占位 -->
    <div id="content" class="container" style="display:grid;grid-template-columns:280px 1fr;gap:24px;padding:48px var(--space-md);">
      <!-- 左侧 Profile 卡片 (阶段 5 细化) -->
      <aside
        v-if="profileStore.profile"
        class="glass-panel sidebar-card"
        style="padding:24px;position:sticky;top:24px;height:fit-content;"
      >
        <h3 style="font-size:var(--fs-xl);">{{ profileStore.profile.name }}</h3>
        <p v-if="profileStore.profile.announcement" style="color:var(--ink-2);margin-top:12px;">
          {{ profileStore.profile.announcement }}
        </p>
        <div style="margin-top:16px;color:var(--ink-2);font-size:var(--fs-sm);">
          (阶段 5: 头像 + 简介 + 社交链接)
        </div>
      </aside>

      <!-- 右侧文章流 (阶段 5 细化) -->
      <main style="display:flex;flex-direction:column;gap:16px;">
        <h2 style="font-size:var(--fs-2xl);">最新文章</h2>
        <div v-if="loading" style="color:var(--ink-2);">加载中...</div>
        <div v-else-if="articles.length === 0" class="glass-panel" style="padding:32px;text-align:center;color:var(--ink-2);">
          还没有文章 (阶段 5: 文章卡片列表)
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 1024px) {
  #content {
    grid-template-columns: 1fr !important;
  }
  .sidebar-card {
    position: relative !important;
    top: auto !important;
  }
}
</style>
