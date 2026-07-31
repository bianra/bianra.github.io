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
    <h1 style="font-size:var(--fs-2xl);margin-bottom:24px;">仪表盘</h1>
    <div v-if="loading" style="color:var(--ink-2);">加载中...</div>

    <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:32px;">
      <div class="glass-panel" style="padding:24px;">
        <div style="color:var(--ink-2);font-size:var(--fs-sm);">文章总数</div>
        <div style="font-size:48px;font-weight:700;background:linear-gradient(135deg,var(--accent),var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.2;margin-top:8px;">
          {{ stats.articleCount }}
        </div>
      </div>
      <div class="glass-panel" style="padding:24px;display:flex;flex-direction:column;gap:8px;justify-content:center;">
        <button class="btn-primary" style="width:100%;" @click="router.push({ name: 'admin-article-new' })">
          + 新建文章
        </button>
        <button class="btn-ghost" style="width:100%;" @click="router.push({ name: 'admin-settings' })">
          设置 & 改密码
        </button>
      </div>
    </div>

    <div class="glass-panel" style="padding:24px;">
      <h3 style="font-size:var(--fs-lg);margin-bottom:16px;">最近 5 篇文章</h3>
      <div v-if="stats.recent.length === 0" style="color:var(--ink-2);">
        还没有文章, 点击上方"新建文章"开始吧
      </div>
      <table v-else style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="color:var(--ink-2);font-size:var(--fs-sm);">
            <th style="padding:10px 12px;text-align:left;">标题</th>
            <th style="padding:10px 12px;text-align:left;">更新时间</th>
            <th style="padding:10px 12px;text-align:right;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in stats.recent" :key="a.id" style="border-top:1px solid var(--border);">
            <td style="padding:10px 12px;">{{ a.title }}</td>
            <td style="padding:10px 12px;color:var(--ink-2);font-size:var(--fs-sm);">
              {{ new Date(a.updatedAt).toLocaleString('zh-CN') }}
            </td>
            <td style="padding:10px 12px;text-align:right;">
              <button class="btn-ghost" style="padding:6px 12px;" @click="router.push({ name: 'admin-article-edit', params: { id: a.id } })">
                编辑
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
