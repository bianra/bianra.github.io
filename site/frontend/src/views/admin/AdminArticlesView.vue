<script setup>
// 文章列表: 搜索 + 分页 + 批量删除 + 单条删除
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
    <div class="page-head">
      <h1 class="page-title">文章管理</h1>
      <div class="head-actions">
        <button
          v-if="selected.size > 0"
          class="btn-danger"
          :disabled="acting"
          @click="removeBatch"
        >删除选中 ({{ selected.size }})</button>
        <button class="btn-primary" @click="router.push({ name: 'admin-article-new' })">+ 新建文章</button>
      </div>
    </div>

    <div class="glass-panel panel-body">
      <!-- 搜索 -->
      <div class="search-bar">
        <input
          v-model="q"
          @keyup.enter="load(1)"
          placeholder="按标题搜索..."
          class="search-input"
        />
        <button class="btn-ghost" @click="load(1)">搜索</button>
      </div>

      <div v-if="loading" class="table-status">加载中...</div>

      <!-- 表格: 外层横向滚动容器, 移动端不挤爆 -->
      <div v-else-if="data.items.length > 0" class="table-scroll">
        <table class="article-table">
          <thead>
            <tr>
              <th class="col-check">
                <input type="checkbox" :checked="allChecked" @change="toggleAll" />
              </th>
              <th class="col-title">标题</th>
              <th class="col-time">更新时间</th>
              <th class="col-ops">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in data.items" :key="a.id" :class="{ 'row-selected': selected.has(a.id) }">
              <td class="col-check">
                <input type="checkbox" :checked="selected.has(a.id)" @change="toggleOne(a.id)" />
              </td>
              <td class="col-title">
                <span class="cell-title">{{ a.title }}</span>
              </td>
              <td class="col-time">
                {{ new Date(a.updatedAt).toLocaleString('zh-CN') }}
              </td>
              <td class="col-ops">
                <button class="btn-ghost btn-sm" @click="router.push({ name: 'admin-article-edit', params: { id: a.id } })">编辑</button>
                <button class="btn-danger-text btn-sm" :disabled="acting" @click="removeOne(a)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        {{ q ? `没有找到与「${q}」相关的文章` : '暂无文章, 点击右上角"新建文章"开始创作' }}
      </div>

      <!-- 分页 -->
      <div v-if="data.pages > 1" class="pager">
        <button class="page-btn" :disabled="curPage <= 1" @click="load(curPage - 1)">‹</button>
        <template v-for="(p, i) in pageList" :key="i">
          <span v-if="p === '...'" class="pager-ellipsis">…</span>
          <button v-else :class="['page-btn', { active: p === curPage }]" @click="load(p)">{{ p }}</button>
        </template>
        <button class="page-btn" :disabled="curPage >= data.pages" @click="load(curPage + 1)">›</button>
      </div>
      <div class="pager-info">
        共 {{ data.total }} 篇 · 第 {{ curPage }}/{{ data.pages || 1 }} 页
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 页头 ===== */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 12px;
  flex-wrap: wrap;
}
.page-title {
  font-size: var(--fs-2xl);
  margin: 0;
}
.head-actions {
  display: flex;
  gap: 8px;
}

/* ===== 面板 ===== */
.panel-body {
  padding: 24px;
}
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.search-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--panel-solid);
  color: var(--ink);
  outline: none;
}
.search-input:focus {
  border-color: var(--accent);
}

/* ===== 状态/空态 ===== */
.table-status {
  color: var(--ink-2);
  padding: 40px 0;
  text-align: center;
}
.empty-state {
  min-height: 20vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
}

/* ===== 表格 ===== */
/* 移动端横向滚动, 桌面正常 */
.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.article-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 560px; /* 过窄时触发横向滚动而非挤压 */
}
.article-table thead tr {
  color: var(--ink-2);
  font-size: var(--fs-sm);
}
.article-table th {
  padding: 10px 12px;
  text-align: left;
  white-space: nowrap;
}
.article-table td {
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}
.col-check {
  width: 40px;
  text-align: left !important;
}
.col-title {
  min-width: 200px;
}
.col-time {
  white-space: nowrap;
  color: var(--ink-2);
  font-size: var(--fs-sm);
}
.col-ops {
  text-align: right;
  white-space: nowrap;
}
.cell-title {
  font-weight: 500;
}
/* 选中行高亮 */
.row-selected td {
  background: rgba(var(--accent-rgb), 0.06);
}
input[type='checkbox'] {
  accent-color: var(--accent);
}

/* ===== 按钮尺寸 ===== */
.btn-sm {
  padding: 6px 12px;
  margin-left: 4px;
}

/* ===== 分页 ===== */
.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
}
.pager-ellipsis {
  color: var(--ink-2);
  padding: 0 4px;
}
.pager-info {
  margin-top: 12px;
  color: var(--ink-2);
  font-size: var(--fs-sm);
  text-align: center;
}
</style>
