<script setup>
// 文章详情页: markdown-it 渲染 + 小框/代码高亮 + 阅读时长
// 阅读增强: 右侧目录 TOC + 标题锚点 + 字号调节 + 图片灯箱 + 上一篇/下一篇 + 返回顶部
import { onMounted, onBeforeUnmount, computed, ref, watch, nextTick } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { publicApi } from '../api/index.js'
import { enhanceRendered, renderMd, injectHeadingIds } from '../utils/markdown.js'

const route = useRoute()
const article = ref(null)
const loading = ref(true)
const err = ref(null)
const html = ref('')

const routeId = computed(() => route.params?.id ?? '')

// 分类中文映射 (与主页一致)
const CAT_MAP = { study: '学习', code: '代码', chat: '闲谈' }

// 字数统计 (参考站格式: xx 字)
const wordCount = computed(() => {
  const content = article.value?.content || ''
  const cn = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (content.match(/[A-Za-z0-9]+/g) || []).length
  return cn + en
})

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

/* ===== 阅读增强状态 ===== */
const toc = ref([])              // [{id, text, level}]
const activeToc = ref('')        // 当前高亮目录项
const fontSize = ref(16)         // 正文字号
const FONT_STEPS = [15, 16, 17]
const lightbox = ref(null)       // {src, alt} | null
const showTop = ref(false)       // 返回顶部按钮
const prevNext = ref({ prev: null, next: null })

// localStorage 读写降级
function readFontSize() {
  try { return parseInt(localStorage.getItem('bianra_post_font') || '16', 10) || 16 } catch { return 16 }
}
function adjustFont(delta) {
  const i = FONT_STEPS.indexOf(fontSize.value)
  const ni = Math.max(0, Math.min(FONT_STEPS.length - 1, i + delta))
  if (ni === i) return
  fontSize.value = FONT_STEPS[ni]
  try { localStorage.setItem('bianra_post_font', String(fontSize.value)) } catch { /* ignore */ }
}
const fontMin = computed(() => fontSize.value <= FONT_STEPS[0])
const fontMax = computed(() => fontSize.value >= FONT_STEPS[FONT_STEPS.length - 1])

let tocObserver = null
let bodyEl = null // 当前正文容器 (事件委托用)

function setupTocObserver() {
  tocObserver?.disconnect()
  tocObserver = null
  if (!toc.value.length) return
  const els = [...document.querySelectorAll('.post-body .post-heading')]
  if (!els.length) return
  // 进入视口上沿 ~80px 区间的标题视为"当前章节"
  tocObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) activeToc.value = en.target.id
    })
  }, { rootMargin: '-80px 0px -70% 0px' })
  els.forEach((el) => tocObserver.observe(el))
}

function scrollToHeading(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 给标题加锚点 # (点击复制链接)
function attachAnchors() {
  document.querySelectorAll('.post-body .post-heading').forEach((h) => {
    if (h.querySelector('.post-anchor')) return
    const a = document.createElement('a')
    a.className = 'post-anchor'
    a.textContent = '#'
    a.href = '#' + h.id
    a.setAttribute('aria-label', '复制章节链接')
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const url = location.origin + location.pathname + '#' + h.id
      history.replaceState(null, '', '#' + h.id)
      navigator.clipboard?.writeText(url).catch(() => {})
      a.textContent = '✓'
      setTimeout(() => { a.textContent = '#' }, 1200)
    })
    h.appendChild(a)
  })
}

// 正文图片点击 → 灯箱 (事件委托, 随节点销毁自动解绑)
function onBodyClick(e) {
  const img = e.target.closest('img')
  if (img) {
    e.preventDefault()
    lightbox.value = { src: img.currentSrc || img.src, alt: img.alt || '' }
  }
}

function closeLightbox() { lightbox.value = null }
function onKeydown(e) { if (e.key === 'Escape') closeLightbox() }
function onScroll() { showTop.value = (window.scrollY || 0) > window.innerHeight }
function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

async function loadArticle(id) {
  loading.value = true
  err.value = null
  article.value = null
  html.value = ''
  toc.value = []
  activeToc.value = ''
  lightbox.value = null
  prevNext.value = { prev: null, next: null }
  try {
    const data = await publicApi.getArticle(id)
    article.value = data
    // markdown-it 渲染 + DOMPurify 消毒 (支持富文本图片尺寸, 防 XSS)
    html.value = renderMd(typeof data.content === 'string' ? data.content : '')
    // 并行加载上一篇/下一篇
    publicApi.getPrevNext(id).then((d) => { prevNext.value = d || { prev: null, next: null } }).catch(() => {})
  } catch (e) {
    err.value = e || new Error('文章不存在')
  } finally {
    loading.value = false
    await nextTick()
    bodyEl = document.querySelector('.post-body')
    if (bodyEl) {
      // 内容图: 防拖拽 + 懒加载 + 灯箱点击
      bodyEl.querySelectorAll('img').forEach(img => {
        img.setAttribute('draggable', 'false')
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy')
      })
      // 代码块复制按钮 + 折叠框 + 标题 id 注入
      enhanceRendered(bodyEl)
      toc.value = injectHeadingIds(bodyEl)
      attachAnchors()
      bodyEl.addEventListener('click', onBodyClick)
      setupTocObserver()
    }
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
  fontSize.value = readFontSize()
  loadArticle(routeId.value)
  document.addEventListener('copy', onCopy)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('copy', onCopy)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll)
  tocObserver?.disconnect()
  bodyEl?.removeEventListener('click', onBodyClick)
})

// 路由 id 变化时(比如从详情 A 跳到详情 B)重新加载
watch(routeId, (id) => id && loadArticle(id))
</script>

<template>
  <div class="post-root">
    <!-- 右侧目录 (桌面 ≥1024px, 标题 ≥2 个才显示) -->
    <aside v-if="toc.length >= 2" class="post-toc" aria-label="文章目录">
      <div class="toc-title">📑 目录</div>
      <a
        v-for="t in toc"
        :key="t.id"
        :href="'#' + t.id"
        :class="['toc-item', { active: activeToc === t.id, sub: t.level === 3 }]"
        @click.prevent="scrollToHeading(t.id)"
      >{{ t.text }}</a>
    </aside>

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
        <!-- 标题 + meta (Argon 风格: 日期 | 分类 | 字数 | 时长) -->
        <header class="post-header">
          <h1 class="post-title">{{ article.title }}</h1>
          <div class="post-meta">
            <span>{{ createdAtStr }}</span>
            <span class="meta-sep">|</span>
            <span>{{ CAT_MAP[article.category] || '学习' }}</span>
            <span class="meta-sep">|</span>
            <span>{{ wordCount }} 字</span>
            <span class="meta-sep">|</span>
            <span>{{ readMinutes }} 分钟</span>
            <template v-if="article.tags && article.tags.length">
              <span class="meta-sep">|</span>
              <span v-for="t in article.tags" :key="t" class="meta-tag">#{{ t }}</span>
            </template>
            <!-- 字号调节 -->
            <span class="meta-sep">|</span>
            <span class="font-ctl" role="group" aria-label="字号调节">
              <button class="font-btn" :disabled="fontMin" title="减小字号" @click="adjustFont(-1)">A−</button>
              <button class="font-btn" :disabled="fontMax" title="增大字号" @click="adjustFont(1)">A+</button>
            </span>
          </div>
        </header>

        <!-- Markdown 正文 (字号由 CSS 变量控制) -->
        <div class="post-body" :style="{ '--post-font-size': fontSize + 'px' }" v-html="html"></div>

        <!-- 上一篇 / 下一篇 -->
        <nav v-if="prevNext.prev || prevNext.next" class="post-pn" aria-label="相邻文章">
          <RouterLink v-if="prevNext.prev" :to="`/post/${prevNext.prev.id}`" class="pn-item pn-prev">
            <span class="pn-label">← 上一篇</span>
            <span class="pn-title">{{ prevNext.prev.title }}</span>
          </RouterLink>
          <span v-else class="pn-item pn-empty"></span>
          <RouterLink v-if="prevNext.next" :to="`/post/${prevNext.next.id}`" class="pn-item pn-next">
            <span class="pn-label">下一篇 →</span>
            <span class="pn-title">{{ prevNext.next.title }}</span>
          </RouterLink>
        </nav>

        <div class="post-footer">
          <RouterLink to="/" class="back-btn">← 返回首页</RouterLink>
        </div>
      </article>
    </div>

    <!-- 返回顶部 -->
    <button v-if="showTop" class="back-top" aria-label="返回顶部" @click="scrollTop">↑</button>

    <!-- 图片灯箱 -->
    <Teleport to="body">
      <div v-if="lightbox" class="lightbox" role="dialog" aria-label="图片预览" @click.self="closeLightbox">
        <img :src="lightbox.src" :alt="lightbox.alt" @click.stop />
        <button class="lightbox-close" aria-label="关闭" @click="closeLightbox">✕</button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.post-root {
  min-height: 100vh;
  width: 100%;
  padding: 96px 0 96px;
  /* 背景透出全站 body 背景图 (--bg-image), 与主页保持一致 */
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
.post-header { margin-bottom: 24px; }
.post-title {
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.35;
  margin: 0 0 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.01em;
}
.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(238, 230, 255, 0.55);
}
.meta-sep { color: rgba(238, 230, 255, 0.25); }
.meta-tag {
  color: rgba(var(--accent-rgb), 0.85);
}

/* 字号调节 */
.font-ctl { display: inline-flex; gap: 4px; }
.font-btn {
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: rgba(238, 230, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.font-btn:hover:not(:disabled) { background: rgba(255,255,255,0.14); color: #fff; }
.font-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* 右侧目录 */
.post-toc {
  position: fixed;
  right: max(24px, calc((100vw - 1180px) / 2 - 200px));
  top: 110px;
  width: 180px;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(12, 10, 22, 0.72);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(10px);
  z-index: 90;
  font-size: 12px;
  scrollbar-width: thin;
}
.toc-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(238, 230, 255, 0.9);
  margin-bottom: 8px;
  letter-spacing: 0.04em;
}
.toc-item {
  display: block;
  padding: 3px 8px;
  margin: 2px 0;
  border-radius: 6px;
  color: rgba(238, 230, 255, 0.55);
  text-decoration: none;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.15s;
}
.toc-item.sub { padding-left: 18px; font-size: 11px; }
.toc-item:hover { color: #fff; background: rgba(255,255,255,0.06); }
.toc-item.active {
  color: #fff;
  background: rgba(var(--accent-rgb), 0.18);
  box-shadow: inset 2px 0 0 var(--accent);
}

/* 上一篇 / 下一篇 */
.post-pn {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.pn-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: inherit;
  text-decoration: none;
  transition: all 0.18s;
  min-width: 0;
}
.pn-item:hover { background: rgba(var(--accent-rgb), 0.12); transform: translateY(-1px); }
.pn-empty { visibility: hidden; }
.pn-label { font-size: 11px; color: rgba(238, 230, 255, 0.5); }
.pn-title {
  font-size: 13px;
  color: #fff;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pn-next { text-align: right; }

/* 返回顶部 */
.back-top {
  position: fixed;
  right: 28px;
  bottom: 32px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(12, 10, 22, 0.8);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  z-index: 90;
  backdrop-filter: blur(8px);
  transition: all 0.18s;
}
.back-top:hover { background: rgba(var(--accent-rgb), 0.35); transform: translateY(-2px); }

/* Markdown 正文 (无卡片包裹, 参考 Argon 全宽阅读) */
.post-body {
  font-size: var(--post-font-size, 16px);
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
  scroll-margin-top: 90px; /* 锚点跳转不被顶部导航遮挡 */
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
  cursor: zoom-in; /* 提示可点击放大 */
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

/* 图片灯箱 */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(5, 3, 14, 0.88);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  animation: lb-in 0.2s ease-out both;
}
.lightbox img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
.lightbox-close {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s;
}
.lightbox-close:hover { background: rgba(255,255,255,0.2); }
@keyframes lb-in { from { opacity: 0; } to { opacity: 1; } }

/* 响应式 */
@media (max-width: 1024px) {
  .post-toc { display: none; } /* 窄屏隐藏侧栏目录 */
}
@media (max-width: 720px) {
  .post-root { padding: 72px 0 64px; }
  .post-container { padding: 0 14px; }
  .post-body { padding: 24px 20px; font-size: 15px; }
  .post-body :deep(h1) { font-size: 24px; }
  .post-body :deep(h2) { font-size: 20px; }
  .post-pn { grid-template-columns: 1fr; }
  .pn-next { text-align: left; }
  .back-top { right: 16px; bottom: 20px; }
}
</style>
