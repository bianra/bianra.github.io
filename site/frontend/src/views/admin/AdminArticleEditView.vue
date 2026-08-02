<script setup>
// 新建/编辑文章: 双栏编辑器 + 工具栏 + 实时预览 + 图片上传 + 自动草稿
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import { adminApi, publicApi } from '../../api/index.js'

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id

const title = ref('')
const summary = ref('')
const content = ref('')
const category = ref('diary')   // 分类: diary 日记 / study 学习 / code 代码
const tagsText = ref('')        // 标签 (逗号分隔的输入文本)
const CATS = [
  { value: 'diary', label: '日记' },
  { value: 'study', label: '学习' },
  { value: 'code',  label: '代码' },
  { value: 'chat',  label: '闲谈' },
]
const saving = ref(false)
const loading = ref(isEdit)
const err = ref('')
const uploading = ref(false)      // 正文插图上传中

const editorRef = ref(null)       // textarea ref
const imgInputRef = ref(null)     // 正文图片 file input

// markdown-it 实例 (与 PostView 一致: 禁原始 html 防 XSS)
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
const preview = computed(() => md.render(content.value || '*预览区: 开始写作后这里会实时显示渲染效果*'))

const wordCount = computed(() => content.value.length)

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

/* ===== 工具栏: 选区操作 ===== */
function applyFormat(type) {
  const ta = editorRef.value
  if (!ta) return
  const s = ta.selectionStart, e = ta.selectionEnd
  const val = ta.value
  const sel = val.slice(s, e)
  let insert = '', caretStart = s, caretEnd = s
  switch (type) {
    case 'bold':  insert = `**${sel || '粗体'}**`; caretStart = s + 2; caretEnd = s + 2 + (sel || '粗体').length; break
    case 'italic':insert = `*${sel || '斜体'}*`;  caretStart = s + 1; caretEnd = s + 1 + (sel || '斜体').length; break
    case 'h2':    insert = `## ${sel || '标题'}`;  caretStart = caretEnd = s + insert.length; break
    case 'link':  insert = `[${sel || '链接文字'}](https://)`; caretStart = s + (sel ? 1 : 1); caretEnd = s + (sel || '链接文字').length + 1; break
    case 'ul':    insert = `- ${sel || '列表项'}`; caretStart = caretEnd = s + insert.length; break
  }
  content.value = val.slice(0, s) + insert + val.slice(e)
  nextTick(() => { ta.focus(); ta.setSelectionRange(caretStart, caretEnd) })
}

/* ===== 图片上传 (正文插图) ===== */
async function onPickImage(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  uploading.value = true
  try {
    const { url } = await adminApi.upload(file)
    const ta = editorRef.value
    const s = ta?.selectionStart ?? content.value.length
    content.value = content.value.slice(0, s) + `\n![](${url})\n` + content.value.slice(s)
  } catch (er) { alert(er.message || '图片上传失败') }
  finally { uploading.value = false }
}

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
    alert('✅ 保存成功')
  } catch (e) { err.value = e.message || '保存失败' }
  finally { saving.value = false }
}

onMounted(async () => {
  if (isEdit) {
    try {
      const a = await publicApi.getArticle(route.params.id)
      title.value = a.title || ''; summary.value = a.summary || ''
      content.value = a.content || ''
      category.value = a.category || 'diary'
      tagsText.value = (Array.isArray(a.tags) ? a.tags : []).join(', ')
      // 有草稿且比文章新 → 询问恢复
      const d = readDraft()
      if (d && d.ts > new Date(a.updatedAt).getTime()) {
        if (confirm('检测到未保存的草稿(比文章新), 是否恢复?')) {
          title.value = d.title; summary.value = d.summary
          content.value = d.content
          if (d.category) category.value = d.category
          if (d.tags) tagsText.value = (Array.isArray(d.tags) ? d.tags : []).join(', ')
        } else { clearDraft() }
      }
    } catch (e) { err.value = '文章加载失败: ' + (e.message || '') }
    finally { loading.value = false }
  } else {
    // 新建页: 有草稿 → 询问恢复
    const d = readDraft()
    if (d && (d.title || d.content) && confirm('检测到上次未完成的文章草稿, 是否恢复?')) {
      title.value = d.title; summary.value = d.summary
      content.value = d.content
      if (d.category) category.value = d.category
      if (d.tags) tagsText.value = (Array.isArray(d.tags) ? d.tags : []).join(', ')
    } else if (d) { clearDraft() }
  }
  draftTimer = setInterval(saveDraft, 30000)
  window.addEventListener('beforeunload', saveDraft)
})

onUnmounted(() => {
  clearInterval(draftTimer)
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
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">标签 <span style="opacity:.6;">(逗号分隔, 如: vue, 日记)</span></label>
          <input v-model="tagsText" placeholder="vue, 生活, 服务器..."
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;font-size:var(--fs-sm);" />
        </div>
      </div>

      <!-- 双栏编辑器 -->
      <div class="glass-panel" style="padding:0;overflow:hidden;">
        <!-- 工具栏 -->
        <div class="toolbar">
          <button class="tool-btn" title="加粗" @click="applyFormat('bold')"><b>B</b></button>
          <button class="tool-btn" title="斜体" @click="applyFormat('italic')"><i>I</i></button>
          <button class="tool-btn" title="二级标题" @click="applyFormat('h2')">H2</button>
          <button class="tool-btn" title="链接" @click="applyFormat('link')">🔗</button>
          <button class="tool-btn" title="无序列表" @click="applyFormat('ul')">• 列表</button>
          <button class="tool-btn" title="插入图片" :disabled="uploading" @click="imgInputRef?.click()">
            {{ uploading ? '上传中...' : '🖼 图片' }}
          </button>
          <input ref="imgInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onPickImage" style="display:none;" />
          <span style="flex:1;"></span>
          <span style="color:var(--ink-2);font-size:var(--fs-xs);">{{ wordCount }} 字</span>
        </div>

        <!-- 编辑 + 预览 -->
        <div class="editor-grid">
          <textarea
            ref="editorRef"
            v-model="content"
            placeholder="# 开始写作...&#10;支持 Markdown 语法, 工具栏可快速排版; 图片按钮可上传插图并自动插入"
            spellcheck="false"
            class="editor-textarea"
          ></textarea>
          <div class="editor-preview md-body" v-html="preview"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex; align-items: center; gap: 4px; padding: 8px 12px;
  border-bottom: 1px solid var(--border); background: rgba(var(--accent-rgb), 0.04);
  flex-wrap: wrap;
}
.tool-btn {
  padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--panel-solid); color: var(--ink); cursor: pointer; font-size: var(--fs-sm);
  transition: all var(--transition); white-space: nowrap;
}
.tool-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.tool-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.editor-grid {
  display: grid; grid-template-columns: 1fr 1fr; min-height: 480px;
}
.editor-textarea {
  padding: 16px; border: none; border-right: 1px solid var(--border);
  background: var(--panel-solid); color: var(--ink);
  font-family: ui-monospace, Consolas, monospace; font-size: var(--fs-sm); line-height: 1.8;
  resize: none; outline: none; width: 100%;
}
.editor-preview {
  padding: 16px 20px; overflow-y: auto; max-height: 70vh; background: var(--bg);
}
/* 预览区 markdown 排版 */
.md-body :deep(h1) { font-size: var(--fs-2xl); margin: 0.6em 0 0.4em; }
.md-body :deep(h2) { font-size: var(--fs-xl); margin: 0.6em 0 0.4em; }
.md-body :deep(h3) { font-size: var(--fs-lg); margin: 0.5em 0 0.3em; }
.md-body :deep(p) { margin: 0.6em 0; line-height: 1.8; }
.md-body :deep(ul), .md-body :deep(ol) { padding-left: 1.5em; margin: 0.6em 0; }
.md-body :deep(li) { margin: 0.2em 0; }
.md-body :deep(img) { max-width: 100%; border-radius: 8px; margin: 0.8em 0; }
.md-body :deep(code) { background: rgba(var(--accent-rgb),0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
.md-body :deep(pre) { background: rgba(0,0,0,0.06); padding: 12px; border-radius: 8px; overflow-x: auto; }
.md-body :deep(blockquote) { border-left: 3px solid var(--accent); padding-left: 12px; color: var(--ink-2); margin: 0.8em 0; }
.md-body :deep(a) { color: var(--accent); }
@media (max-width: 900px) {
  .editor-grid { grid-template-columns: 1fr; }
  .editor-textarea { border-right: none; border-bottom: 1px solid var(--border); min-height: 300px; }
}
</style>
