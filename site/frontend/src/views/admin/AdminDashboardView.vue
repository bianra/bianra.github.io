<script setup>
// 后台仪表盘: 文章总数卡片 + 最近 5 篇
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '../../api/index.js'

const router = useRouter()
const stats = ref({ articleCount: 0, recent: [] })
const loading = ref(true)

onMounted(async () => {
  try { stats.value = await adminApi.stats() } finally { loading.value = false }
})
</script>

<template>
  <div>
    <h1 class="page-title">仪表盘</h1>
    <div v-if="loading" class="dashboard-status">加载中...</div>

    <template v-else>
      <div class="stat-grid">
        <div class="glass-panel stat-card">
          <div class="stat-label">文章总数</div>
          <div class="stat-number">{{ stats.articleCount }}</div>
        </div>
        <div class="glass-panel stat-actions">
          <button class="btn-primary action-btn" @click="router.push({ name: 'admin-article-new' })">
            + 新建文章
          </button>
          <button class="btn-ghost action-btn" @click="router.push({ name: 'admin-settings' })">
            设置 & 改密码
          </button>
        </div>
      </div>

      <div class="glass-panel recent-panel">
        <h3 class="recent-title">最近 5 篇文章</h3>
        <div v-if="stats.recent.length === 0" class="recent-empty">
          还没有文章, 点击上方"新建文章"开始吧
        </div>
        <div v-else class="table-scroll">
          <table class="recent-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>更新时间</th>
                <th class="col-ops">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in stats.recent" :key="a.id">
                <td class="cell-title">{{ a.title }}</td>
                <td class="cell-time">{{ new Date(a.updatedAt).toLocaleString('zh-CN') }}</td>
                <td class="col-ops">
                  <button class="btn-ghost btn-sm" @click="router.push({ name: 'admin-article-edit', params: { id: a.id } })">
                    编辑
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-title {
  font-size: var(--fs-2xl);
  margin: 0 0 24px;
}
.dashboard-status {
  color: var(--ink-2);
  padding: 24px 0;
}

/* ===== 统计卡片 ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.stat-card {
  padding: 24px;
}
.stat-label {
  color: var(--ink-2);
  font-size: var(--fs-sm);
}
.stat-number {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 8px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.stat-actions {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}
.action-btn {
  width: 100%;
}

/* ===== 最近文章 ===== */
.recent-panel {
  padding: 24px;
}
.recent-title {
  font-size: var(--fs-lg);
  margin: 0 0 16px;
}
.recent-empty {
  color: var(--ink-2);
  padding: 12px 0;
}
.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.recent-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 480px;
}
.recent-table thead tr {
  color: var(--ink-2);
  font-size: var(--fs-sm);
}
.recent-table th {
  padding: 10px 12px;
  text-align: left;
}
.recent-table td {
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}
.cell-title {
  font-weight: 500;
}
.cell-time {
  color: var(--ink-2);
  font-size: var(--fs-sm);
  white-space: nowrap;
}
.col-ops {
  text-align: right;
  white-space: nowrap;
}
.btn-sm {
  padding: 6px 12px;
}
</style>
