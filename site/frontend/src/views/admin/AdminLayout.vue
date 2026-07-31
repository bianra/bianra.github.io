<script setup>
// 后台 Layout: 左侧窄导航 + 主区 RouterView
import { RouterView, useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth.js'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const nav = [
  { name: 'admin-dashboard', label: '仪表盘', icon: '📊' },
  { name: 'admin-articles', label: '文章管理', icon: '📝' },
  { name: 'admin-settings', label: '设置', icon: '⚙️' },
]

const activeName = computed(() => route.name)

async function doLogout() {
  await auth.logout()
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <div style="min-height:100vh;display:flex;background:var(--bg);">
    <!-- 左侧导航 -->
    <aside
      class="glass-panel"
      style="width:220px;margin:20px;padding:24px 16px;display:flex;flex-direction:column;gap:4px;position:sticky;top:20px;height:calc(100vh - 40px);"
    >
      <div style="padding:8px 12px;margin-bottom:24px;">
        <div style="font-size:var(--fs-xl);font-weight:600;background:linear-gradient(135deg,var(--accent),var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent;">bianra</div>
        <div style="font-size:var(--fs-xs);color:var(--ink-2);margin-top:4px;">后台管理</div>
      </div>
      <router-link
        v-for="item in nav"
        :key="item.name"
        :to="{ name: item.name }"
        :class="['nav-item', { active: activeName === item.name }]"
        style="padding:10px 14px;border-radius:var(--radius-sm);display:flex;gap:10px;align-items:center;color:var(--ink-2);font-weight:500;text-decoration:none;transition:all var(--transition);"
      >
        <span>{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </router-link>

      <div style="flex:1;"></div>

      <button
        class="nav-item"
        style="padding:10px 14px;border-radius:var(--radius-sm);display:flex;gap:10px;align-items:center;color:var(--ink-2);font-weight:500;width:100%;"
        @click="doLogout"
      >
        <span>🚪</span><span>退出登录</span>
      </button>
    </aside>

    <!-- 主内容 -->
    <main style="flex:1;padding:20px 20px 20px 0;">
      <RouterView v-slot="{ Component, route }">
        <div v-if="auth.checking" class="glass-panel" style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-2);min-height:70vh;">
          加载中...
        </div>
        <component v-else :is="Component" :key="route.fullPath" class="page-enter" />
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.nav-item:hover {
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--ink);
}
.nav-item.active {
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.15), rgba(74, 168, 255, 0.12));
  color: var(--ink);
  font-weight: 600;
}
</style>
