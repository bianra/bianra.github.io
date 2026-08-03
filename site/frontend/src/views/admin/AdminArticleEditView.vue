<script setup>
// 新建/编辑文章: 富文本编辑器(TipTap) + 图片上传 + 自动草稿
import { onMounted, onUnmounted, ref, computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi, publicApi } from '../../api/index.js'
import { confirm } from '../../components/ConfirmDialog.vue'
import { toast } from '../../components/Toast.vue'
// 富文本编辑器懒加载 (TipTap 体积大, 仅编辑页需要)
const MdEditor = defineAsyncComponent(() => import('../../components/MdEditor.vue'))

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id

const title = ref('')
const summary = ref('')
const content = ref('')
const category = ref('study')   // 分类: study 学习 / code 代码 / chat 闲谈
const tagsText = ref('')        // 标签 (逗号分隔的输入文本)
const CATS = [
  { value: 'study', label: '学习' },
  { value: 'code',  label: '代码' },
  { value: 'chat',  label: '闲谈' },
]
const saving = ref(false)
const loading = ref(isEdit)
const err = ref('')

const wordCount = computed(() => content.value.length)

// 图片上传 (传给 MdEditor, 复用 /admin/api/upload)
async function uploadImage(file) {
  const { url } = await adminApi.upload(file)
  return { url }
}

/* ===== 草稿 (localStorage, 每 30s 自动存; 新建页/编辑页独立 key) ===== */
const DRAFT_KEY = isEdit ? `article_draft_${route.params.id}` : 'article_draft_new'
let draftTimer = 0

function saveDraft() {
  if (!title.value && !content.value) return
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    title: title.value, summary: summary.value,
    content: content.value,
    category: category.value, tags: parseTagsInput(tagsText.value), ts: Date.now(),
  }))
}
function readDraft() {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
function clearDraft() { localStorage.removeItem(DRAFT_KEY) }

// 标签文本 → 数组 (按逗号/空格/中文逗号切分, 去空去重)
function parseTagsInput(str) {
  return [...new Set(String(str || '').split(/[,，]/).map(s => s.trim()).filter(Boolean))]
}
async function save() {
  if (!title.value.trim()) { err.value = '标题不能为空'; return }
  saving.value = true; err.value = ''
  try {
    const body = {
      title: title.value.trim(), summary: summary.value,
      content: content.value,
      category: category.value,
      tags: parseTagsInput(tagsText.value),
    }
    if (isEdit) {
      await adminApi.updateArticle(route.params.id, body)
      clearDraft()
    } else {
      const r = await adminApi.createArticle(body)
      clearDraft()
      router.replace({ name: 'admin-article-edit', params: { id: r.id } })
    }
    toast.success('✅ 保存成功')
  } catch (e) { err.value = e.message || '保存失败' }
  finally { saving.value = false }
}

onMounted(async () => {
  try {
    if (isEdit) {
      const a = await publicApi.getArticle(route.params.id)
      title.value = a.title || ''; summary.value = a.summary || ''
      content.value = a.content || ''
      category.value = a.category || 'study'
      tagsText.value = (Array.isArray(a.tags) ? a.tags : []).join(', ')
      // 有草稿且比文章新 → 询问恢复
      const d = readDraft()
      if (d && d.ts > new Date(a.updatedAt).getTime()) {
        const ok = await confirm({ title: '恢复草稿', message: '检测到未保存的草稿(比文章新), 是否恢复?', okText: '恢复' })
        if (ok) {
          title.value = d.title; summary.value = d.summary
          content.value = d.content
          if (d.category) category.value = d.category
          if (d.tags) tagsText.value = (Array.isArray(d.tags) ? d.tags : []).join(', ')
        } else { clearDraft() }
      }
    } else {
      // 新建页: 有草稿 → 询问恢复
      const d = readDraft()
      if (d && (d.title || d.content)) {
        const ok = await confirm({ title: '恢复草稿', message: '检测到上次未完成的文章草稿, 是否恢复?', okText: '恢复' })
        if (ok) {
          title.value = d.title; summary.value = d.summary
          content.value = d.content
          if (d.category) category.value = d.category
          if (d.tags) tagsText.value = (Array.isArray(d.tags) ? d.tags : []).join(', ')
        } else { clearDraft() }
      } else if (d) { clearDraft() }
    }
  } catch (e) {
    // 任何加载/恢复异常都不阻塞编辑器
    if (isEdit) err.value = '文章加载失败: ' + (e.message || '')
    else clearDraft()
  } finally {
    loading.value = false
    draftTimer = setInterval(saveDraft, 30000)
    window.addEventListener('beforeunload', saveDraft)
  }
})

onUnmounted(() => {
  clearInterval(draftTimer)
  clearTimeout(enhanceTimer)
  window.removeEventListener('beforeunload', saveDraft)
})
</script>

<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;gap:12px;flex-wrap:wrap;">
      <h1 style="font-size:var(--fs-2xl);">{{ isEdit ? '编辑文章' : '新建文章' }}</h1>
      <div style="display:flex;gap:8px;">
        <router-link :to="{ name: 'admin-articles' }" class="btn-ghost">取消</router-link>
        <button class="btn-primary" :disabled="saving || loading" @click="save">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="glass-panel" style="padding:40px;text-align:center;color:var(--ink-2);">加载中...</div>

    <template v-else>
      <div v-if="err" style="margin-bottom:16px;padding:12px;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:var(--radius-sm);font-size:var(--fs-sm);">
        {{ err }}
      </div>

      <div class="glass-panel" style="padding:24px;display:flex;flex-direction:column;gap:16px;margin-bottom:16px;">
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">标题 (≤100 字)</label>
          <input v-model="title" type="text" maxlength="100" placeholder="文章标题..."
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);font-size:var(--fs-lg);font-weight:600;outline:none;" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">摘要 (≤200 字)</label>
          <input v-model="summary" type="text" maxlength="200" placeholder="这篇文章讲了啥..."
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">分类</label>
          <select v-model="category"
            style="padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;font-size:var(--fs-sm);">
            <option v-for="c in CATS" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">标签 <span style="opacity:.6;">(逗号分隔, 如: vue, 生活)</span></label>
          <input v-model="tagsText" placeholder="vue, 生活, 服务器..."
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;font-size:var(--fs-sm);" />
        </div>
      </div>

      <!-- 富文本编辑器 (TipTap: 所见即所得 + 图片拖拽) -->
      <div class="glass-panel" style="padding:0;overflow:hidden;">
        <MdEditor v-model="content" :uploader="uploadImage" />
      </div>
    </template>
  </div>
</template>


