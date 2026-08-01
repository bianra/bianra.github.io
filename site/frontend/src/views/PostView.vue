<script setup>
// 文章详情页: markdown-it 渲染 + 封面大图 + 阅读时长(按字数估算)
import { onMounted, onBeforeUnmount, computed, ref, watch, nextTick } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { publicApi } from '../api/index.js'
import MarkdownIt from 'markdown-it'

const route = useRoute()
const article = ref(null)
const loading = ref(true)
const err = ref(null)
const html = ref('')
const md = new MarkdownIt({
  html: false,       // XSS 防护: 禁止渲染原生 HTML
  linkify: true,
  breaks: true,
  typographer: false,
})

const routeId = computed(() => route.params?.id ?? '')

// 阅读时长: 中文 ~400字/分钟, 英文 ~200词/分钟
const readMinutes = computed(() => {
  const content = article.value?.content || ''
  const cn = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (content.match(/[A-Za-z]+/g) || []).length
  return Math.max(1, Math.round(cn / 400 + en / 200))
})

const createdAtStr = computed(() => {
  if (!article.value?.createdAt) return ''
  const d = new Date(article.value.createdAt)
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
})

async function loadArticle(id) {
  loading.value = true
  err.value = null
  article.value = null
  html.value = ''
  try {
    const data = await publicApi.getArticle(id)
    article.value = data
    // markdown-it 渲染 → v-html 注入 (html=false 已禁原生 HTML, 防 XSS)
    html.value = md.render(typeof data.content === 'string' ? data.content : '')
  } catch (e) {
    err.value = e || new Error('文章不存在')
  } finally {
    loading.value = false
    await nextTick()
    // 给所有内容图加 draggable=false (内容保护)
    document.querySelectorAll('.post-body img').forEach(img => {
      img.setAttribute('draggable', 'false')
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy')
    })
  }
}

// 复制正文追加版权尾注
function onCopy(e) {
  const sel = window.getSelection && window.getSelection()
  if (!sel || sel.isCollapsed) return
  const text = sel.toString()
  if (text.length < 60) return
  e.preventDefault()
  const suffix = '\n\n—— 本文来自 bianra.com (https://bianra.com)'
  try {
    e.clipboardData.setData('text/plain', text + suffix)
  } catch (_) { /* ignore */ }
}

onMounted(() => {
  loadArticle(routeId.value)
  document.addEventListener('copy', onCopy)
})
onBeforeUnmount(() => {
  document.removeEventListener('copy', onCopy)
})

// 路由 id 变化时(比如从详情 A 跳到详情 B)重新加载
watch(routeId, (id) => id && loadArticle(id))
</script>

<template>
  <div class="post-root">
    <div class="post-container">
      <div v-if="loading" class="post-loading">
        <div class="spinner"></div>
        <span>文章加载中...</span>
      </div>

      <div v-else-if="err" class="post-empty light-card">
        <div class="empty-bubble">📝</div>
        <h2>这篇文章走丢了</h2>
        <p style="color:var(--ink-2);margin:8px 0 20px;">可能被删了，也可能还没写出来</p>
        <RouterLink to="/" class="back-btn">← 返回首页</RouterLink>
      </div>

      <article v-else class="post-article">
        <!-- 封面图 -->
        <div v-if="article.coverUrl" class="cover-wrap">
          <img :src="article.coverUrl" :alt="article.title" draggable="false" />
        </div>

        <!-- 标题 + meta -->
        <header class="post-header">
          <h1 class="post-title">{{ article.title }}</h1>
          <div class="post-meta">
            <span class="meta-chip">📅 {{ createdAtStr }}</span>
            <span class="meta-chip">📖 {{ readMinutes }} 分钟阅读</span>
            <span v-if="article.summary" class="meta-chip" style="max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" :title="article.summary">📌 {{ article.summary }}</span>
          </div>
        </header>

        <!-- Markdown 正文 -->
        <div
          class="post-body light-card"
          v-html="html"
        ></div>

        <div class="post-footer">
          <RouterLink to="/" class="back-btn">← 返回首页</RouterLink>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.post-root {
  min-height: 100vh;
  width: 100%;
  padding: 96px 0 96px;
  background:
    radial-gradient(ellipse 70% 50% at 20% 15%, #3a1e72 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 85% 85%, rgba(150, 50, 200, 0.45) 0%, transparent 60%),
    linear-gradient(160deg, #2a1454 0%, #12072b 45%, #0a0516 100%);
  background-attachment: fixed;
}

.post-container {
  max-width: 820px;
  margin: 0 auto;
  padding: 0 24px;
}

/* loading */
.post-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 0;
  color: #fff;
  opacity: 0.85;
}
.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 404 */
.post-empty {
  text-align: center;
  padding: 56px 24px;
}
.empty-bubble {
  font-size: 44px;
  margin-bottom: 8px;
}
.post-empty h2 {
  color: #fff;
  font-size: 22px;
  margin: 0 0 8px;
}
.back-btn {
  display: inline-block;
  padding: 10px 22px;
  border-radius: 10px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  text-decoration: none;
  transition: background var(--transition);
}
.back-btn:hover { background: rgba(255,255,255,0.18); }

/* 文章 */
.post-article {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #fff;
}
.cover-wrap {
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}
.cover-wrap img {
  width: 100%;
  height: auto;
  max-height: 380px;
  object-fit: cover;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.post-header { margin-bottom: 4px; }
.post-title {
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.35;
  margin: 0 0 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.01em;
}
.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  color: rgba(238, 230, 255, 0.82);
  border: 1px solid rgba(255,255,255,0.1);
}

/* Markdown 正文 (深色磨砂) */
.post-body {
  padding: 40px 44px;
  font-size: 16px;
  line-height: 1.85;
  color: rgba(240, 234, 255, 0.92);
}
/* 全局样式穿透 → Markdown 生成元素无 scoped, 用 :deep() */
.post-body :deep(h1), .post-body :deep(h2), .post-body :deep(h3),
.post-body :deep(h4), .post-body :deep(h5), .post-body :deep(h6) {
  color: #fff;
  font-weight: 700;
  margin: 32px 0 14px;
  line-height: 1.35;
}
.post-body :deep(h1) { font-size: 28px; }
.post-body :deep(h2) { font-size: 24px; margin-top: 40px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.post-body :deep(h3) { font-size: 20px; }
.post-body :deep(p) { margin: 14px 0; }
.post-body :deep(a) { color: #7cc4ff; text-decoration: none; border-bottom: 1px solid rgba(124,196,255,0.35); transition: all 0.15s; }
.post-body :deep(a:hover) { color: #aad3ff; border-bottom-color: #aad3ff; }
.post-body :deep(strong) { color: #fff; font-weight: 700; }
.post-body :deep(em) { color: rgba(255, 214, 240, 0.95); }
.post-body :deep(ul), .post-body :deep(ol) { padding-left: 24px; margin: 14px 0; }
.post-body :deep(li) { margin: 4px 0; }
.post-body :deep(blockquote) {
  margin: 18px 0;
  padding: 10px 18px;
  border-left: 3px solid rgba(124, 108, 240, 0.7);
  background: rgba(124, 108, 240, 0.08);
  color: rgba(220, 212, 240, 0.88);
  border-radius: 0 8px 8px 0;
}
.post-body :deep(code) {
  font-family: ui-monospace, 'Cascadia Mono', Consolas, Menlo, monospace;
  padding: 2px 7px;
  font-size: 13.5px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.42);
  color: #f1b5e2;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.post-body :deep(pre) {
  margin: 20px 0;
  padding: 18px 22px;
  border-radius: 12px;
  background: rgba(8, 4, 18, 0.88);
  border: 1px solid rgba(255,255,255,0.08);
  overflow-x: auto;
  line-height: 1.6;
}
.post-body :deep(pre code) {
  background: transparent;
  border: none;
  padding: 0;
  font-size: 13.5px;
  color: #e6d8ff;
}
.post-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  margin: 18px auto;
  display: block;
  box-shadow: 0 8px 28px rgba(0,0,0,0.45);
  user-select: none;
  -webkit-user-drag: none;
}
.post-body :deep(hr) {
  margin: 32px 0;
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
}
.post-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 18px 0;
  font-size: 14px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
}
.post-body :deep(th), .post-body :deep(td) {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  text-align: left;
}
.post-body :deep(th) { background: rgba(255,255,255,0.06); color: #fff; }

.post-footer {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

/* 响应式 */
@media (max-width: 720px) {
  .post-root { padding: 72px 0 64px; }
  .post-container { padding: 0 14px; }
  .post-body { padding: 24px 20px; font-size: 15px; }
  .post-body :deep(h1) { font-size: 24px; }
  .post-body :deep(h2) { font-size: 20px; }
  .cover-wrap img { max-height: 260px; }
}
</style>
