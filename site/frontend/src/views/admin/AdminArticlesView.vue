<script setup>
// 文章列表: 搜索 + 分页 + 批量删除 + 单条删除 + 封面缩略图
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '../../api/index.js'
import { confirm } from '../../components/ConfirmDialog.vue'
import { toast } from '../../components/Toast.vue'

const router = useRouter()
const q = ref('')
const data = ref({ items: [], total: 0, page: 1, pages: 0 })
const selected = ref(new Set())
const loading = ref(true)
const acting = ref(false) // 删除中
const curPage = ref(1)

async function load(page = 1) {
  loading.value = true
  curPage.value = page
  selected.value = new Set()
  try {
    data.value = await adminApi.listArticles({ q: q.value, page, limit: 10 })
  } finally { loading.value = false }
}

onMounted(() => load())

const allChecked = computed(() =>
  data.value.items.length > 0 && data.value.items.every(a => selected.value.has(a.id))
)
function toggleOne(id) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}
function toggleAll() {
  const s = new Set(selected.value)
  if (allChecked.value) {
    data.value.items.forEach(a => s.delete(a.id))
  } else {
    data.value.items.forEach(a => s.add(a.id))
  }
  selected.value = s
}

async function removeOne(a) {
  const ok = await confirm({ title: '删除文章', message: `确定删除文章「${a.title}」? 此操作不可恢复`, okText: '确认删除' })
  if (!ok) return
  acting.value = true
  try {
    await adminApi.deleteArticle(a.id)
    await load(curPage.value)
    toast.success('已删除')
  } catch (e) {
    toast.error(e.message || '删除失败')
  } finally { acting.value = false }
}

async function removeBatch() {
  const ids = [...selected.value]
  if (ids.length === 0) return
  const ok = await confirm({ title: '批量删除', message: `确定删除选中的 ${ids.length} 篇文章? 此操作不可恢复`, okText: '确认删除' })
  if (!ok) return
  acting.value = true
  try {
    await adminApi.deleteArticles(ids)
    await load(curPage.value)
    toast.success(`已删除 ${ids.length} 篇`)
  } catch (e) {
    toast.error(e.message || '批量删除失败')
  } finally { acting.value = false }
}

// 分页: 最多显示 7 个页码, 超出用省略号
const pageList = computed(() => {
  const total = data.value.pages || 0
  const cur = curPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', cur - 1, cur, cur + 1, '...', total]
})
</script>

<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;gap:12px;flex-wrap:wrap;">
      <h1 style="font-size:var(--fs-2xl);">文章管理</h1>
      <div style="display:flex;gap:8px;">
        <button
          v-if="selected.size > 0"
          class="btn-danger"
          :disabled="acting"
          @click="removeBatch"
        >删除选中 ({{ selected.size }})</button>
        <button class="btn-primary" @click="router.push({ name: 'admin-article-new' })">+ 新建文章</button>
      </div>
    </div>

    <div class="glass-panel" style="padding:24px;">
      <!-- 搜索 -->
      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <input
          v-model="q"
          @keyup.enter="load(1)"
          placeholder="按标题搜索..."
          style="flex:1;padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;"
        />
        <button class="btn-ghost" @click="load(1)">搜索</button>
      </div>

      <div v-if="loading" style="color:var(--ink-2);padding:40px 0;text-align:center;">加载中...</div>

      <table v-else-if="data.items.length > 0" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="color:var(--ink-2);font-size:var(--fs-sm);">
            <th style="padding:10px 12px;text-align:left;width:40px;">
              <input type="checkbox" :checked="allChecked" @change="toggleAll" style="accent-color:var(--accent);" />
            </th>
            <th style="padding:10px 12px;text-align:left;">标题</th>
            <th style="padding:10px 12px;text-align:left;">更新时间</th>
            <th style="padding:10px 12px;text-align:right;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in data.items" :key="a.id" style="border-top:1px solid var(--border);">
            <td style="padding:10px 12px;">
              <input type="checkbox" :checked="selected.has(a.id)" @change="toggleOne(a.id)" style="accent-color:var(--accent);" />
            </td>
            <td style="padding:10px 12px;font-weight:500;">{{ a.title }}</td>
            <td style="padding:10px 12px;color:var(--ink-2);font-size:var(--fs-sm);">
              {{ new Date(a.updatedAt).toLocaleString('zh-CN') }}
            </td>
            <td style="padding:10px 12px;text-align:right;white-space:nowrap;">
              <button class="btn-ghost" style="padding:6px 12px;" @click="router.push({ name: 'admin-article-edit', params: { id: a.id } })">编辑</button>
              <button class="btn-danger-text" style="padding:6px 12px;margin-left:4px;" :disabled="acting" @click="removeOne(a)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state" style="min-height:20vh;">
        {{ q ? `没有找到与「${q}」相关的文章` : '暂无文章, 点击右上角"新建文章"开始创作' }}
      </div>

      <!-- 分页 -->
      <div v-if="data.pages > 1" style="display:flex;justify-content:center;align-items:center;gap:6px;margin-top:20px;">
        <button class="page-btn" :disabled="curPage <= 1" @click="load(curPage - 1)">‹</button>
        <template v-for="(p, i) in pageList" :key="i">
          <span v-if="p === '...'" style="color:var(--ink-2);padding:0 4px;">…</span>
          <button v-else :class="['page-btn', { active: p === curPage }]" @click="load(p)">{{ p }}</button>
        </template>
        <button class="page-btn" :disabled="curPage >= data.pages" @click="load(curPage + 1)">›</button>
      </div>
      <div style="margin-top:12px;color:var(--ink-2);font-size:var(--fs-sm);text-align:center;">
        共 {{ data.total }} 篇 · 第 {{ curPage }}/{{ data.pages || 1 }} 页
      </div>
    </div>
  </div>
</template>

<!-- 按钮/分页类已提升到 tokens.css 全局定义, 此处不再重复 -->

