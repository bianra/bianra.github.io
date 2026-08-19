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
  { name: 'admin-agent', label: '知识 Agent', icon: '🤖' },
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
  <div class="admin-shell">
    <!-- 左侧导航 -->
    <aside class="glass-panel admin-sidebar">
      <div class="brand-block">
        <div class="brand-name">bianra</div>
        <div class="brand-sub">后台管理</div>
      </div>
      <router-link
        v-for="item in nav"
        :key="item.name"
        :to="{ name: item.name }"
        :class="['nav-item', { active: activeName === item.name }]"
      >
        <span>{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </router-link>

      <div class="spacer"></div>

      <button class="nav-item logout-btn" @click="doLogout">
        <span>🚪</span><span>退出登录</span>
      </button>
    </aside>

    <!-- 主内容 -->
    <main class="admin-main">
      <RouterView v-slot="{ Component, route }">
        <div v-if="auth.checking" class="glass-panel loading-panel">
          加载中...
        </div>
        <component v-else :is="Component" :key="route.fullPath" class="page-enter" />
      </RouterView>
      <footer class="admin-footer">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">陕ICP备2026020676号</a>
      </footer>
    </main>
  </div>
</template>

<style scoped>
/* ===== 整体布局 ===== */
.admin-shell {
  min-height: 100vh;
  display: flex;
  background: var(--bg);
}

/* ===== 左侧导航 ===== */
.admin-sidebar {
  margin: 20px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 20px;
  height: calc(100vh - 40px);
  width: 220px;
  flex-shrink: 0;
}
.brand-block {
  padding: 8px 12px;
  margin-bottom: 24px;
}
.brand-name {
  font-size: var(--fs-xl);
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.brand-sub {
  font-size: var(--fs-xs);
  color: var(--ink-2);
  margin-top: 4px;
}
.nav-item {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--ink-2);
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition);
}
.nav-item:hover {
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--ink);
}
.nav-item.active {
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.15), rgba(74, 168, 255, 0.12));
  color: var(--ink);
  font-weight: 600;
}
.logout-btn {
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  text-align: left;
}
.spacer {
  flex: 1;
}

/* ===== 主内容 ===== */
.admin-main {
  flex: 1;
  padding: 20px 20px 0 0;
  min-width: 0; /* 防止表格撑破 flex 布局 */
}
.loading-panel {
  height: 100%;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
}
.admin-footer {
  padding: 14px 0 18px;
  color: var(--ink-2);
  font-size: 12px;
  text-align: center;
}
.admin-footer a {
  color: inherit;
  text-decoration: none;
}

/* ===== 响应式: ≤1024px 侧栏收起为顶部横向导航条 ===== */
@media (max-width: 1024px) {
  .admin-shell {
    flex-direction: column;
  }
  .admin-sidebar {
    width: auto;
    height: auto;
    position: static;
    margin: 12px;
    padding: 10px 14px;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
  }
  .brand-block {
    margin-bottom: 0;
    margin-right: auto;
    padding: 0 12px 0 4px;
  }
  .nav-item {
    white-space: nowrap;
    padding: 8px 12px;
  }
  .spacer {
    display: none;
  }
  .admin-main {
    padding: 12px;
  }
}
</style>
