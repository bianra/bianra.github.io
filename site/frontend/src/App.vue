<script setup>
// 顶层 App: ProgressBar + RouterView(公开/后台)
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import ScrollProgressBar from './components/ScrollProgressBar.vue'
import TopNavbar from './components/TopNavbar.vue'
import { useProfileStore } from './stores/profile.js'

const profileStore = useProfileStore()
// 全站初始化: 拉取个人资料并应用自定义背景图 (若有), 任意页面进入都生效
onMounted(() => { profileStore.fetchProfile() })
</script>

<template>
  <ScrollProgressBar />

  <RouterView v-slot="{ Component, route }">
    <!-- 判断页面类型: 后台 Admin 套 / 404 不需要 Navbar/Footer -->
    <div class="page-shell">
      <!-- 公开站顶部操作栏 (始终渲染, 首页由 HomeView 控制显隐, 其他页面默认显示) -->
      <TopNavbar
        v-if="route.meta?.type !== 'admin' && route.name !== 'not-found'"
      />

      <!-- 页面内容 -->
      <div class="page-enter" :key="route.fullPath">
        <component :is="Component" />
      </div>
    </div>
  </RouterView>
</template>

<style>
#app {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.page-enter-active, .page-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}
.page-enter-from, .page-leave-to { opacity: 0; transform: translateY(8px); }
</style>
