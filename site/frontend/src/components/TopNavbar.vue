<script setup>
// 顶部导航栏：fixed 顶部，滚动显隐 (由 --nav-opacity --nav-translate 控制)
// logo 文字 bian + ra(粉色渐变) + 右侧搜索
// 显隐由 CSS 变量直接在 .top-navbar 类中引用, 不用 :style 内联绑定 (更可靠)
// 搜索: 点击图标向左扩展出搜索框, 再次点击/Esc/失焦则收起
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchOpen = ref(false)
const query = ref('')
const inputRef = ref(null)

async function toggleSearch() {
  if (searchOpen.value) {
    // 已展开 → 有内容则执行搜索, 无内容则收起
    if (query.value.trim()) {
      doSearch()
    } else {
      closeSearch()
    }
  } else {
    searchOpen.value = true
    await nextTick()
    inputRef.value?.focus()
  }
}

function closeSearch() {
  searchOpen.value = false
  query.value = ''
}

function doSearch() {
  const q = query.value.trim()
  if (!q) return
  // 归档页已移除, 搜索改为在首页展示匹配结果
  router.push({ path: '/', query: { q } })
  closeSearch()
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    closeSearch()
    inputRef.value?.blur()
  } else if (e.key === 'Enter') {
    doSearch()
  }
}

// 点击外部收起
function onDocClick(e) {
  if (!searchOpen.value) return
  const wrap = document.querySelector('.search-wrap')
  if (wrap && !wrap.contains(e.target)) closeSearch()
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <header
    id="top-navbar"
    class="top-navbar"
    role="banner"
  >
    <div class="nav-inner">
      <RouterLink to="/" class="logo-wrap" aria-label="bianra 首页">
        <span class="logo-bian">bian</span><span class="logo-ra">ra</span>
      </RouterLink>
      <nav class="nav-links" aria-label="主导航">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/?cat=diary">日记</RouterLink>
        <RouterLink to="/?cat=study">学习</RouterLink>
        <RouterLink to="/?cat=code">代码</RouterLink>
        <RouterLink to="/?cat=chat">闲谈</RouterLink>
      </nav>
      <div class="nav-right">
        <!-- 搜索容器: 图标按钮 + 向左展开的输入框 -->
        <!-- @click.stop: 阻止冒泡到 document, 防止 onDocClick 把刚展开的搜索框误收起 -->
        <div class="search-wrap" :class="{ open: searchOpen }" @click.stop>
          <input
            ref="inputRef"
            v-model="query"
            class="search-input"
            type="text"
            placeholder="搜索文章…"
            aria-label="搜索文章"
            @keydown="onKeydown"
          />
          <button
            class="icon-btn light search-btn"
            :class="{ active: searchOpen }"
            :title="searchOpen ? (query.trim() ? '搜索' : '收起') : '搜索'"
            :aria-label="searchOpen ? (query.trim() ? '搜索' : '收起') : '搜索'"
            :aria-expanded="searchOpen"
            @click="toggleSearch"
          >
            <!-- 展开且无内容: 显示 X 收起图标; 其他: 显示搜索图标 -->
            <svg v-if="searchOpen && !query.trim()" viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 64px;
  background: rgba(18, 14, 38, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  /* Nav 显隐: 用 CSS 变量 (由 JS setProperty 控制) */
  opacity: var(--nav-opacity, 1);
  transform: translateY(var(--nav-translate, 0px));
  /* 透明时禁止点击, 防止遮挡下面的元素 */
  pointer-events: var(--nav-pointer, auto);
  /* Nav 滑入/滑出过渡 */
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.28s ease;
  will-change: opacity, transform;
}
html.ks-dark .top-navbar {
  background: rgba(12, 10, 22, 0.94);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.nav-inner {
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 var(--space-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.logo-wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 0;
  font-size: 22px;
  letter-spacing: 0.01em;
  color: #fff;
  font-weight: 500;
  transition: transform var(--transition);
}
.logo-wrap:hover { transform: translateY(-1px); }
.logo-bian { font-weight: 600; }

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  justify-content: center;
}
.nav-links a {
  color: rgba(238, 230, 255, 0.78);
  font-size: var(--fs-sm);
  transition: color var(--transition);
  position: relative;
}
.nav-links a:hover { color: #fff; }
.nav-links a::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent), var(--pink));
  border-radius: 2px;
  transition: width var(--transition), left var(--transition);
}
.nav-links a:hover::after {
  width: 100%;
  left: 0;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ===== 搜索: 点击向左扩展 ===== */
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  /* 默认只有按钮宽度, 展开时由 input 撑开 */
}
.search-input {
  /* 默认折叠: width 0 + opacity 0 + 不可交互 */
  width: 0;
  opacity: 0;
  padding: 8px 0;
  margin-right: 0;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: var(--fs-sm);
  outline: none;
  cursor: text;
  white-space: nowrap;
  overflow: hidden;
  transition: width 0.32s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.22s ease,
              padding 0.32s cubic-bezier(0.22, 1, 0.36, 1),
              margin 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.search-wrap.open .search-input {
  /* 展开: 宽度撑到 220px, 左右留 padding, 可交互 */
  width: 220px;
  opacity: 1;
  padding: 8px 12px;
  margin-right: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
}
.search-wrap.open .search-input:focus {
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.12);
}
.search-wrap.open .search-input::placeholder {
  color: rgba(238, 230, 255, 0.5);
}

.search-btn.active {
  /* 展开时按钮高亮 */
  background: rgba(124, 108, 240, 0.22);
  color: #fff;
  border-color: rgba(124, 108, 240, 0.4);
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  /* 移动端搜索框窄一点 */
  .search-wrap.open .search-input {
    width: 150px;
  }
}
</style>
