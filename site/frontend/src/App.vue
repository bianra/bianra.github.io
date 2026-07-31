<script setup>
// 顶层 App: 包裹公开站 RouterView + 后台 RouterView
// 主题切换、滚动进度条等全局组件在各 Layout 中挂载
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import { useThemeStore } from './stores/theme.js'

const theme = useThemeStore()
const toggleLabel = computed(() => theme.isDark ? '☀️' : '🌙')
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <!-- 全局浮动主题切换按钮 (开发阶段, 后续移到 Layout 中) -->
    <button
      id="global-theme-toggle"
      class="glass-panel"
      :title="`切换到${theme.isDark ? '浅色' : '深色'}模式`"
      style="position:fixed;top:20px;right:20px;z-index:9999;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:20px;"
      @click="theme.toggle()"
      aria-label="主题切换"
    >{{ toggleLabel }}</button>

    <component :is="Component" :key="route.fullPath" class="page-enter" />
  </RouterView>
</template>

<style>
#app {
  min-height: 100vh;
  width: 100%;
}
</style>
