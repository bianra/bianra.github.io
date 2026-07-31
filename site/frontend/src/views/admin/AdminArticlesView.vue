<script setup>
// 文章列表: 搜索 + 分页 + 批量删除 (阶段 6 细化)
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '../../api/index.js'

const router = useRouter()
const q = ref('')
const data = ref({ items: [], total: 0, page: 1, pages: 0 })
const selected = ref(new Set())
const loading = ref(true)

async function load(page = 1) {
  loading.value = true
  try {
    data.value = await adminApi.listArticles({ q: q.value, page, limit: 10 })
  } finally { loading.value = false }
}

onMounted(() => load())
</script>

<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <h1 style="font-size:var(--fs-2xl);">文章管理</h1>
      <button class="btn-primary" @click="router.push({ name: 'admin-article-new' })">+ 新建文章</button>
    </div>

    <div class="glass-panel" style="padding:24px;">
      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <input
          v-model="q"
          @keyup.enter="load(1)"
          placeholder="按标题搜索..."
          style="flex:1;padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;"
        />
        <button class="btn-ghost" @click="load(1)">搜索</button>
      </div>

      <div v-if="loading" style="color:var(--ink-2);">加载中...</div>
      <table v-else-if="data.items.length > 0" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="color:var(--ink-2);font-size:var(--fs-sm);">
            <th style="padding:10px 12px;text-align:left;width:52px;"></th>
            <th style="padding:10px 12px;text-align:left;">标题</th>
            <th style="padding:10px 12px;text-align:left;">更新时间</th>
            <th style="padding:10px 12px;text-align:right;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in data.items" :key="a.id" style="border-top:1px solid var(--border);">
            <td style="padding:10px 12px;">
              <input type="checkbox" style="accent-color:var(--accent);" />
            </td>
            <td style="padding:10px 12px;">{{ a.title }}</td>
            <td style="padding:10px 12px;color:var(--ink-2);font-size:var(--fs-sm);">
              {{ new Date(a.updatedAt).toLocaleString('zh-CN') }}
            </td>
            <td style="padding:10px 12px;text-align:right;">
              <button class="btn-ghost" style="padding:6px 12px;" @click="router.push({ name: 'admin-article-edit', params: { id: a.id } })">编辑</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state" style="min-height:20vh;">
        暂无文章
      </div>

      <div style="margin-top:16px;color:var(--ink-2);font-size:var(--fs-sm);">
        阶段 6: 分页、批量删除、缩略图
      </div>
    </div>
  </div>
</template>
