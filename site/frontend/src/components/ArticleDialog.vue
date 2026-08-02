<script setup>
// 文章悬浮框: 点击文章在当前位置弹出, 背景(主页)保持不变
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { publicApi } from '../api/index.js'
import { createMd, enhanceRendered } from '../utils/markdown.js'

const props = defineProps({
  articleId: { type: [Number, String], default: null },
})
const emit = defineEmits(['close'])

const md = createMd()
const loading = ref(false)
const err = ref('')
const article = ref(null)
const html = ref('')

const bodyRef = ref(null)

async function load(id) {
  if (!id) return
  loading.value = true
  err.value = ''
  article.value = null
  html.value = ''
  try {
    const data = await publicApi.getArticle(id)
    article.value = data
    html.value = md.render(typeof data.content === 'string' ? data.content : '')
  } catch (e) {
    err.value = e.message || '文章加载失败'
  } finally {
    loading.value = false
    await nextTick()
    // 图片懒加载 + 内容保护 + 代码/小框增强
    bodyRef.value?.querySelectorAll('img').forEach(img => {
      img.setAttribute('draggable', 'false')
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy')
    })
    enhanceRendered(bodyRef.value)
  }
}

// 打开时加载 + 锁定背景滚动
watch(() => props.articleId, (id) => {
  load(id)
  document.body.style.overflow = 'hidden'
})

function close() {
  document.body.style.overflow = ''
  emit('close')
}

// ESC 关闭
function onKeydown(e) {
  if (e.key === 'Escape') close()
}

// 点击遮罩关闭
function onMask(e) {
  if (e.target === e.currentTarget) close()
}

// 打开时绑定 ESC
watch(() => props.articleId, (id) => {
  if (id) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})

// 阅读时长: 中文 ~400字/分, 英文 ~200词/分
const readMinutes = computed(() => {
  const content = article.value?.content || ''
  const cn = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (content.match(/[A-Za-z]+/g) || []).length
  return Math.max(1, Math.round(cn / 400 + en / 200))
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="articleId" class="dialog-mask" @click.self="onMask">
        <div class="dialog-box" role="dialog" aria-modal="true">
          <!-- 头部: 标题 + 关闭 -->
          <header class="dialog-head">
            <div v-if="article" class="dialog-title-wrap">
              <h2 class="dialog-title">{{ article.title }}</h2>
              <div class="dialog-meta">
                <span v-if="article.createdAt">{{ String(article.createdAt).slice(0, 10) }}</span>
                <span v-if="article.category" class="meta-chip">{{ { study: '学习', code: '代码', chat: '闲谈' }[article.category] || article.category }}</span>
                <span v-for="t in (article.tags || [])" :key="t" class="meta-chip"># {{ t }}</span>
                <span v-if="article.content">{{ readMinutes }} 分钟阅读</span>
              </div>
            </div>
            <button class="dialog-close" aria-label="关闭" @click="close">✕</button>
          </header>

          <!-- 内容 -->
          <div class="dialog-body">
            <div v-if="loading" class="dialog-status">加载中...</div>
            <div v-else-if="err" class="dialog-status dialog-err">{{ err }}</div>
            <div v-else-if="html" ref="bodyRef" class="dialog-content md-body" v-html="html"></div>
            <div v-else class="dialog-status">文章为空</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 9990;
  background: rgba(5, 3, 14, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.dialog-box {
  width: min(760px, 100%);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: rgba(20, 15, 40, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}
.dialog-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 24px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.dialog-title-wrap { flex: 1; min-width: 0; }
.dialog-title {
  font-size: clamp(18px, 2.4vw, 24px);
  font-weight: 700;
  line-height: 1.35;
  margin: 0 0 8px;
  color: #fff;
}
.dialog-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: rgba(220, 212, 240, 0.6);
}
.meta-chip {
  padding: 1px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.dialog-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(235, 225, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-close:hover { background: rgba(255, 107, 133, 0.2); color: #fff; transform: rotate(90deg); }
.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 28px;
}
.dialog-status {
  padding: 40px 0;
  text-align: center;
  color: var(--ink-2);
}
.dialog-err { color: #ffb0b8; }

/* 过渡动画 */
.dialog-enter-active, .dialog-leave-active { transition: opacity 0.25s ease; }
.dialog-enter-from, .dialog-leave-to { opacity: 0; }
.dialog-enter-active .dialog-box { animation: dialog-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes dialog-in {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
</style>
