<script setup>
// 主页: 全屏艺术字 + 整页统一背景图 (var(--bg-image), 下滑不换色)
// 滚动动画: 艺术字纯淡出 opacity 1→0 + translateY(0→-70), 不做模糊
// 主内容: 左 70% 文章列表 | 右 30% Profile卡 + 公告卡 (布局已交换，右栏 sticky)
import { onMounted, onBeforeUnmount, ref, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProfileStore } from '../stores/profile.js'
import { publicApi } from '../api/index.js'
import { quoteOfDay, todayLocalStr } from '../utils/quotes.js'
import ProfileCard from '../components/ProfileCard.vue'
import FortuneCard from '../components/FortuneCard.vue'

const route = useRoute()
const router = useRouter()
const profileStore = useProfileStore()
const articles = ref([])
const loading = ref(true)

// 阅读时长估算: 按字数 (中文 400 字/分钟), 最少 1 分钟
function readingMinutes(article) {
  const len = article?.content?.length || article?.summary?.length || 0
  return Math.max(1, Math.round(len / 400))
}

// ====== 封页打字机: 先打 LIFE · THOUGHTS, 再显示每日一言 ======
const SLOGAN = 'LIFE · THOUGHTS'
const typedText = ref('')            // 打字机当前显示的文本
const quoteText = ref('')            // 今日一言 (打字机结束后淡入显示)
const typing = ref(true)             // 打字中: 光标实心; 结束: 闪烁
let typeTimer = 0

function startTypewriter() {
  typedText.value = ''
  quoteText.value = ''
  typing.value = true
  let i = 0
  clearInterval(typeTimer)
  typeTimer = setInterval(() => {
    i++
    typedText.value = SLOGAN.slice(0, i)
    if (i >= SLOGAN.length) {
      clearInterval(typeTimer)
      typing.value = false
      // 打字结束后延迟显示每日一言
      setTimeout(() => {
        quoteText.value = quoteOfDay(todayLocalStr())
      }, 400)
    }
  }, 90)
}

// 分类映射: cat 参数 → 中文标题
const CAT_MAP = { diary: '日记', study: '学习', code: '代码', chat: '闲谈' }
const currentCat = ref('')  // 当前分类 (空 = 全部)

// 当前激活的分类 (空 = 首页/全部), 用于侧边导航高亮
const activeCat = computed(() => route.query.cat || '')

// 滚动到内容区首屏 (y=vh), 复用 snap 锁机制防止与 onScroll 抢滚动
function scrollToContent() {
  const vh = window.innerHeight
  clearTimeout(snapTimer)
  snappingLock = true
  window.scrollTo({ top: vh, behavior: 'smooth' })
  setTimeout(() => { snappingLock = false }, SNAP_DURATION + 40)
}

// 侧边导航点击: 首页 → 回到 hero 顶部并清空分类
function goHome() {
  router.push({ path: '/', query: {} })
  clearTimeout(snapTimer)
  snappingLock = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
  setTimeout(() => { snappingLock = false }, SNAP_DURATION + 40)
  // 回到封面时隐藏顶部导航 (保持首页初始状态)
  setNav(false)
  navVisible = false
}

// 侧边导航点击: 日记/学习/代码 → 设置分类 + 滚到内容区
function goCat(cat) {
  // 同路径只改 query, 组件不重载, watch 会触发 loadArticles
  router.push({ path: '/', query: { cat } })
  nextTick(() => scrollToContent())
  // 进入内容区时显示顶部导航, 方便后续操作
  setNav(true)
  navVisible = true
}

async function loadArticles() {
  loading.value = true
  currentCat.value = CAT_MAP[route.query.cat] || ''
  try {
    const params = { page: 1, limit: PAGE_SIZE }
    if (route.query.cat) params.cat = route.query.cat
    if (route.query.q) params.q = route.query.q
    if (route.query.tag) params.tag = route.query.tag
    const res = await publicApi.listArticles(params)
    articles.value = res?.items || []
    totalPages.value = res?.pages || 1
  } catch (_) { /* 后端未启动则占位 */ }
  loading.value = false
}

// ====== 分页: 加载更多 ======
const PAGE_SIZE = 6
const currentPage = ref(1)
const totalPages = ref(1)
const loadingMore = ref(false)
const hasMore = computed(() => currentPage.value < totalPages.value)

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const params = { page: currentPage.value + 1, limit: PAGE_SIZE }
    if (route.query.cat) params.cat = route.query.cat
    if (route.query.q) params.q = route.query.q
    if (route.query.tag) params.tag = route.query.tag
    const res = await publicApi.listArticles(params)
    articles.value = [...articles.value, ...(res?.items || [])]
    currentPage.value += 1
    totalPages.value = res?.pages || 1
  } catch (_) { /* 静默 */ }
  loadingMore.value = false
}

// 搜索关键词 (用于标题显示)
const searchKeyword = computed(() => String(route.query.q || '').trim())

// ====== 标签云 ======
const tagCloud = ref([])
async function loadTagCloud() {
  try {
    const data = await publicApi.getTagCloud()
    tagCloud.value = data || []
  } catch (_) { /* 忽略 */ }
}

// 当前激活标签 (路由 ?tag= 参数)
const activeTag = computed(() => String(route.query.tag || '').trim())

// 点击标签 → 跳首页按标签筛选
function goTag(tag) {
  router.push({ path: '/', query: { ...route.query, tag, page: undefined } })
}

// 监听路由 cat / q 变化重新加载
// 顶部导航点击分类/搜索: 若已在首页(组件不重载), 加载后直接跳内容区, 不停在封页
// 用无动画直跳 (auto), 避免 smooth 被吸附逻辑打断
async function onCatQueryChange() {
  currentPage.value = 1
  await loadArticles()
  if (route.query.cat || route.query.q) {
    await nextTick()
    clearTimeout(snapTimer)
    snappingLock = true
    window.scrollTo({ top: window.innerHeight, behavior: 'auto' })
    setTimeout(() => { snappingLock = false }, 80)
  }
}
watch(() => route.query.cat, onCatQueryChange)
watch(() => route.query.q, onCatQueryChange)
watch(() => route.query.tag, onCatQueryChange)

// ====== 滚动动画: 每帧更新 --hero-* / --nav-* CSS 变量 (不做 blur 纯淡出) ======
// 吸附 (snap) 原则: 只在接近两端时才吸附, 中段 (18%~82%) 完全留给用户自由停, 不绑架滚动
// Nav 显示逻辑: 下滑 → 从顶部滑入显示; 上滑 → 滑出隐藏 (像 iOS 导航栏)
let rafId = 0
let snapTimer = 0
let inputLockTimer = 0
let userInteracting = false
let snappingLock = false
let lastScrollY = 0
let navVisible = false
const NAV_THRESHOLD = 6

const SNAP_DELAY     = 260
const INPUT_COOLDOWN = 150
const SNAP_LOW       = 0.18
const SNAP_HIGH      = 0.82
const SNAP_DURATION  = 650

function onScroll() {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(updateVars)
  clearTimeout(snapTimer)

  // ── Nav 方向切换: 下滑显 / 上滑隐 ──
  const y = window.scrollY || 0
  const dy = y - lastScrollY
  if (Math.abs(dy) > NAV_THRESHOLD) {
    if (dy > 0 && y > 80 && !navVisible) {
      navVisible = true
      setNav(true)
    } else if (dy < 0 && navVisible) {
      navVisible = false
      setNav(false)
    }
    lastScrollY = y
  }

  if (userInteracting || snappingLock) return
  snapTimer = setTimeout(doSnap, SNAP_DELAY)
}

function setNav(show) {
  const root = document.documentElement
  root.style.setProperty('--nav-opacity', show ? '1' : '0')
  root.style.setProperty('--nav-translate', show ? '0px' : '-64px')
  // 透明时禁用点击, 防止遮挡下方元素 (如 hero 艺术字)
  root.style.setProperty('--nav-pointer', show ? 'auto' : 'none')
}

// 用户主动 wheel / touch 开始 → 立刻取消任何待执行吸附 + 锁住直到冷却
function onUserInput() {
  clearTimeout(snapTimer)
  clearTimeout(inputLockTimer)
  userInteracting = true
  inputLockTimer = setTimeout(() => { userInteracting = false }, INPUT_COOLDOWN)
}

function updateVars() {
  const y = window.scrollY || window.pageYOffset
  const vh = window.innerHeight

  // ── Hero 渐隐: 严格对齐 1vh (y=0 全显, y=vh 完全消失 & 刚到 content 顶边) ──
  const heroProgress = Math.max(0, Math.min(1, y / vh))

  // easeOutCubic
  const heroEase = 1 - Math.pow(1 - heroProgress, 3)

  const root = document.documentElement
  root.style.setProperty('--hero-opacity',   (1 - heroEase).toFixed(4))
  root.style.setProperty('--hero-translate', (heroEase * -70).toFixed(1) + 'px')
  // Nav 由方向切换控制 (setNav), 这里不再改 --nav-*

  return { heroProgress, vh, y }
}

// 吸附逻辑: 只在接近两端时才吸, 中段 (SNAP_LOW, SNAP_HIGH) 完全不吸 → 用户自由停
function doSnap() {
  // 三重保护: 交互中 / 已在 snap 锁定中 / (保险) 又有滚动中
  if (userInteracting || snappingLock) return
  const { heroProgress, vh, y } = updateVars() || { heroProgress: 0, vh: 0, y: 0 }

  if (heroProgress >= 1) return                                // 进入内容区下方 → 不管
  if (heroProgress <= SNAP_LOW && y > 4) {
    // 0 < p ≤ 18%: 快到顶但没到位 → 吸回 0
    triggerSnap(0)
  } else if (heroProgress >= SNAP_HIGH && heroProgress < 1) {
    // 82% ≤ p < 1: 快到内容首但差一点 → 吸到 vh
    triggerSnap(vh)
  }
  // 中间 18%~82% → 不吸附, 给用户自由欣赏半透明效果 / 自由停顿
}
function triggerSnap(target) {
  const y = window.scrollY || window.pageYOffset
  // target 钳制: 不超过文档最大可滚动距离, 页面不够高时也能吸到可到达的最下点 (不会被浏览器截断后看起来"没动")
  const maxScrollY = document.documentElement.scrollHeight - window.innerHeight
  target = Math.max(0, Math.min(target, Math.max(0, maxScrollY)))
  if (Math.abs(y - target) < 4) return   // 已经到位不用动
  snappingLock = true
  clearTimeout(snapTimer)
  window.scrollTo({ top: target, behavior: 'smooth' })
  // 预估 smooth 完成后解锁
  setTimeout(() => { snappingLock = false }, SNAP_DURATION + 40)
}

// ====== 生命周期 ======
onMounted(async () => {
  await profileStore.fetchProfile()
  await loadArticles()
  loadTagCloud()
  updateVars()
  setNav(false)  // 首页初始隐藏 TopNavbar (下滑时 setNav(true) 才显)
  startTypewriter() // 封页打字机
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  // 主动交互 (滚轮/触摸) → 立即取消吸附, 不抢用户控制权
  window.addEventListener('wheel', onUserInput, { passive: true })
  window.addEventListener('touchstart', onUserInput, { passive: true })

  // ↓ 箭头点击 → 用原生 smooth 滚到 #content 首屏 (即 y=vh)
  document.querySelector('.hero-down')?.addEventListener('click', (e) => {
    e.preventDefault()
    const vh = window.innerHeight
    // 点击箭头是"明确的用户意图跳转", 直接 snap 到内容顶, 不受 input 冷却影响
    clearTimeout(snapTimer)
    snappingLock = true
    window.scrollTo({ top: vh, behavior: 'smooth' })
    setTimeout(() => { snappingLock = false }, SNAP_DURATION + 40)
  }, { passive: false })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(snapTimer)
  clearTimeout(inputLockTimer)
  clearInterval(typeTimer)
  snappingLock = false
  userInteracting = false
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  window.removeEventListener('wheel', onUserInput)
  window.removeEventListener('touchstart', onUserInput)
  const root = document.documentElement
  ;['--hero-opacity','--hero-translate','--nav-opacity','--nav-translate']
    .forEach(p => root.style.removeProperty(p))
})
</script>

<template>
  <div class="home-root">
    <!-- ====== 第一屏 Hero: 整页统一背景 (var(--bg-image)) + 中央艺术字 ====== -->
    <section id="bianra" class="hero-section" aria-label="封面">
      <!-- 中央艺术字 bianra + 打字机副标 + 每日一言 (由 hero-art-wrap 统一应用渐隐动画) -->
      <div class="hero-art-wrap hero-center">
        <h1 class="art-bianra hero-word">bianra</h1>
        <p class="hero-sub">
          <span class="type-cursor" :class="{ blink: !typing }">{{ typedText }}</span>
        </p>
        <transition name="quote-fade">
          <p v-if="quoteText" class="hero-quote">{{ quoteText }}</p>
        </transition>
      </div>

      <!-- 底部 ↓ 箭头 (仅箭头, 无文字) + 平滑滚动锚点 -->
      <a href="#content" class="hero-down" aria-label="向下滚动">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </a>
    </section>

    <!-- ====== 第二屏起: 主内容区 (左 信息小框 | 右 文章列表) ====== -->
    <section id="content" class="content-section" aria-label="内容区">
      <div class="content-grid container">
        <!-- 右: 文章列表 -->
        <main class="article-col" aria-label="文章列表">
          <!-- 标题: 分类 / 搜索结果 / 全部 -->
          <h2 v-if="currentCat" class="cat-title">{{ currentCat }}</h2>
          <h2 v-else-if="searchKeyword" class="cat-title">搜索「{{ searchKeyword }}」</h2>
          <ul v-if="articles.length" class="article-list">
            <li v-for="(a, i) in articles" :key="a.id || i" class="article-item light-card fade-up" :style="`animation-delay:${i*40}ms`">
              <RouterLink
                v-if="a.id"
                :to="`/post/${a.id}`"
                class="article-link"
              >
                <h3 class="article-title">{{ a.title }}</h3>
                <div class="article-meta">
                  <span v-if="a.createdAt" class="meta-item">
                    <svg class="meta-icon" viewBox="0 0 24 24" width="12" height="12" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    {{ String(a.createdAt).slice(0,10) }}
                  </span>
                  <span class="meta-divider">·</span>
                  <span class="meta-item">
                    <svg class="meta-icon" viewBox="0 0 24 24" width="12" height="12" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                    {{ readingMinutes(a) }} 分钟阅读
                  </span>
                </div>
                <p v-if="a.summary" class="article-summary">{{ a.summary }}</p>
                <div class="article-tags">
                  <span class="tag">{{ CAT_MAP[a.category] || '日记' }}</span>
                  <span v-for="t in (a.tags || [])" :key="t" class="tag tag-item" @click.prevent="goTag(t)"># {{ t }}</span>
                </div>
              </RouterLink>
              <div v-else class="article-link">
                <h3 class="article-title">{{ a.title }}</h3>
                <div class="article-meta">
                  <span v-if="a.createdAt" class="meta-item">
                    <svg class="meta-icon" viewBox="0 0 24 24" width="12" height="12" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    {{ String(a.createdAt).slice(0,10) }}
                  </span>
                  <span class="meta-divider">·</span>
                  <span class="meta-item">
                    <svg class="meta-icon" viewBox="0 0 24 24" width="12" height="12" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                    {{ readingMinutes(a) }} 分钟阅读
                  </span>
                </div>
                <p v-if="a.summary" class="article-summary">{{ a.summary }}</p>
                <div class="article-tags">
                  <span class="tag">{{ CAT_MAP[a.category] || '日记' }}</span>
                  <span v-for="t in (a.tags || [])" :key="t" class="tag tag-item" @click.prevent="goTag(t)"># {{ t }}</span>
                </div>
              </div>
            </li>
          </ul>

          <!-- 加载更多 -->
          <div v-if="hasMore" class="load-more-wrap">
            <button class="load-more-btn" :disabled="loadingMore" @click="loadMore">
              {{ loadingMore ? '加载中…' : '加载更多' }}
            </button>
          </div>
        </main>

        <!-- 左: 导航菜单 + Profile卡 -->
        <aside class="side-col" aria-label="侧边栏">
          <!-- 导航菜单 (深色磨砂卡) -->
          <nav class="side-nav light-card" aria-label="侧边导航">
            <a href="/" class="side-nav-item" :class="{ active: !activeCat }" @click.prevent="goHome">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                     stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </span>
              首页
            </a>
            <a href="/?cat=diary" class="side-nav-item" :class="{ active: activeCat === 'diary' }" @click.prevent="goCat('diary')">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                     stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </span>
              日记
            </a>
            <a href="/?cat=study" class="side-nav-item" :class="{ active: activeCat === 'study' }" @click.prevent="goCat('study')">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                     stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </span>
              学习
            </a>
            <a href="/?cat=code" class="side-nav-item" :class="{ active: activeCat === 'code' }" @click.prevent="goCat('code')">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                     stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </span>
              代码
            </a>
            <a href="/?cat=chat" class="side-nav-item" :class="{ active: activeCat === 'chat' }" @click.prevent="goCat('chat')">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                     stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </span>
              闲谈
            </a>
          </nav>
          <ProfileCard />
          <FortuneCard />

          <!-- 标签云 -->
          <div v-if="tagCloud.length" class="tag-cloud light-card">
            <div class="tag-cloud-title">🏷 标签</div>
            <div class="tag-cloud-body">
              <button
                v-for="t in tagCloud"
                :key="t.name"
                class="cloud-tag"
                :class="{ active: activeTag === t.name }"
                @click="goTag(t.name)"
              >
                {{ t.name }}<span class="cloud-count">{{ t.count }}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-root {
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow-x: hidden;
}

/* ============== Hero 封面 ============== */
.hero-section {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* 背景图已统一在 body 上: var(--bg-image) + --bg-overlay, 整页共用不换色 */
}

.hero-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
  padding: 0 24px;
}
.hero-word {
  font-size: clamp(92px, 17vw, 220px);
  margin: 0;
}
.hero-sub {
  color: rgba(235, 225, 255, 0.72);
  font-size: clamp(12px, 1.2vw, 15px);
  letter-spacing: 0.38em;
  text-indent: 0.38em;
  text-transform: uppercase;
  font-weight: 500;
  min-height: 1.6em; /* 打字机期间占位, 防止跳动 */
}

/* 打字机光标 */
.type-cursor::after {
  content: '|';
  margin-left: 2px;
  color: rgba(var(--accent-rgb), 0.9);
  animation: cursor-blink 0.8s step-end infinite;
}
.type-cursor.blink::after {
  animation: none;
  opacity: 1;
}
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 每日一言 */
.hero-quote {
  margin: 0;
  font-size: clamp(13px, 1.4vw, 16px);
  color: rgba(235, 225, 255, 0.85);
  letter-spacing: 0.08em;
  font-family: var(--font-art);
  text-transform: none;
  text-indent: 0;
}
.quote-fade-enter-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.quote-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.hero-down {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.65);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: color var(--transition);
  z-index: 10;
}
.hero-down:hover { color: #fff; }
.hero-down svg {
  animation: chevron-bob 1.6s ease-in-out infinite;
}
.hero-down-tip {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  opacity: 0.7;
}
@keyframes chevron-bob {
  0%, 100% { transform: translateY(0); opacity: 0.7; }
  50%      { transform: translateY(6px); opacity: 1; }
}

/* ============== 内容区 ============== */
.content-section {
  width: 100%;
  /* 透明: 直接透出 body 级背景图, 下滑也不换色 */
  background: transparent;
  padding: 64px 0 96px;
  position: relative;
}

.content-grid {
  display: grid;
  /* 左: 信息卡 280-300px + 导航菜单 | 右: 文章自适应占满 */
  grid-template-columns: minmax(280px, 300px) minmax(0, 1fr);
  gap: 32px;
  align-items: start;
  max-width: 1400px;
  padding-left: 16px;
  padding-right: 32px;
}
.side-col { grid-column: 1 / 2; grid-row: 1; min-width: 0; }
.article-col { grid-column: 2 / 3; grid-row: 1; min-width: 0; }

.article-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.article-item {
  padding: 0;
  overflow: hidden;
}
.article-link {
  display: block;
  padding: 22px 24px;
  color: inherit;
}
.article-link:hover {
  /* 深色磨砂卡 hover: 底色稍亮 */
  background: rgba(255, 255, 255, 0.06);
}

/* 加载更多 */
.load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.load-more-btn {
  padding: 10px 32px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--ink);
  font-size: var(--fs-sm);
  cursor: pointer;
  transition: all var(--transition);
}
.load-more-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.2);
  transform: translateY(-2px);
}
.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.article-title {
  font-size: var(--fs-lg);
  color: var(--ink);
  font-weight: 600;
  line-height: 1.4;
}
.article-summary {
  margin-top: 10px;
  color: var(--ink-2);
  font-size: var(--fs-sm);
  line-height: 1.75;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-2);
  font-size: var(--fs-xs);
  opacity: 0.85;
  flex-wrap: wrap;
}
.meta-item { white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; }
.meta-icon { opacity: 0.9; }
.meta-divider { opacity: 0.4; }
.article-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 11px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(220, 212, 240, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14);
}
/* 文章内可点击标签 */
.tag-item {
  cursor: pointer;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
}
.tag-item:hover {
  background: rgba(var(--accent-rgb), 0.18);
  color: #fff;
  border-color: rgba(var(--accent-rgb), 0.4);
}

/* 标签云 (侧栏) */
.tag-cloud {
  padding: 16px 18px;
}
.tag-cloud-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
  letter-spacing: 0.02em;
}
.tag-cloud-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cloud-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(220, 212, 240, 0.85);
  cursor: pointer;
  transition: all var(--transition);
}
.cloud-tag:hover {
  background: rgba(var(--accent-rgb), 0.18);
  color: #fff;
  border-color: rgba(var(--accent-rgb), 0.4);
  transform: translateY(-1px);
}
.cloud-tag.active {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  border-color: transparent;
}
.cloud-count {
  font-size: 10px;
  opacity: 0.7;
}

/* 右: 侧栏 */
.side-col {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: 96px;
}

/* 侧边导航菜单 */
.side-nav {
  padding: 16px 20px;
}
.side-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--ink-2);
  font-size: var(--fs-sm);
  font-weight: 500;
  transition: all var(--transition);
  text-decoration: none;
  cursor: pointer;
}
.side-nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--ink);
}
.side-nav-item.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.nav-icon {
  font-size: 14px;
  width: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.side-nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 10px 4px;
}
.side-nav-search {
  color: var(--ink-2);
  opacity: 0.9;
}

/* ============== 响应式 ============== */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 28px;
    /* 小屏回居中 + 对称 padding */
    max-width: 900px;
    justify-content: center;
    padding-left: 20px;
    padding-right: 20px;
  }
  .side-col {
    position: relative;
    top: auto;
    grid-column: auto;   /* 取消宽屏列指定 */
    grid-row: auto;
    order: 2;             /* 小屏时: 文章先显示, 信息卡后 */
  }
  .article-col {
    grid-column: auto;
    grid-row: auto;
    order: 1;
  }
}

@media (max-width: 640px) {
  .content-grid {
    padding-left: 16px;
    padding-right: 16px;
  }
  .hero-sub { letter-spacing: 0.28em; text-indent: 0.28em; }
  .content-section { padding: 40px 0 64px; }
}
</style>
