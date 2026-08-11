<script setup>
// 左侧栏双标签: 抽签(迷你每日抽签, 复用 fortune.js 纯函数) | 贪吃蛇(入口)
// 标签样式对齐顶部导航 nav-item: 极简文字链接 + 下划线 hover/激活
import { ref, computed } from 'vue'
import { getIdentity, todayLocalStr, rollFortune } from '../utils/fortune.js'

const activeTab = ref('fortune') // 'fortune' | 'snake'

// ===== 抽签 =====
const today = todayLocalStr()
const identity = getIdentity()
const phase = ref('idle') // idle | shaking | revealed
const result = ref(null)

function doRoll() {
  if (phase.value === 'shaking') return
  result.value = rollFortune(identity, today)
  phase.value = 'shaking'
  setTimeout(() => { phase.value = 'revealed' }, 720)
}

const levelCls = computed(() => {
  switch (result.value?.level) {
    case '大吉': return 'lvl-great'
    case '中吉': return 'lvl-mid'
    case '小吉': return 'lvl-slight'
    case '吉':   return 'lvl-ok'
    default:     return 'lvl-end'
  }
})
const dateLabel = computed(() => today.slice(5)) // MM-DD
</script>

<template>
  <div class="fortune-mini light-card">
    <!-- 双标签栏: 抽签 / 贪吃蛇 -->
    <nav class="mini-tabs" aria-label="侧栏小游戏">
      <button
        class="mini-tab"
        :class="{ active: activeTab === 'fortune' }"
        @click="activeTab = 'fortune'"
      >抽签</button>
      <button
        class="mini-tab"
        :class="{ active: activeTab === 'snake' }"
        @click="activeTab = 'snake'"
      >贪吃蛇</button>
    </nav>

    <!-- ===== 抽签 tab: 迷你抽签卡 ===== -->
    <template v-if="activeTab === 'fortune'">
      <div class="mini-head">
        <span class="mini-title">🍵 每日抽签</span>
        <span class="mini-date">{{ dateLabel }}</span>
      </div>

      <div class="mini-card-wrap">
        <!-- 卡背 -->
        <div
          v-if="phase === 'idle' || phase === 'shaking'"
          class="mini-card mini-back"
          :class="{ shake: phase === 'shaking' }"
          @click="doRoll"
        >
          <div class="mini-hint">{{ phase === 'shaking' ? '抽取中…' : '点击抽今日运势' }}</div>
        </div>

        <!-- 卡正面 -->
        <transition name="mini-flip" mode="out-in">
          <div v-if="phase === 'revealed'" class="mini-card mini-front" :key="'mini-' + today">
            <div class="mini-level" :class="levelCls">{{ result.level }}</div>
            <div class="mini-luck-row">
              <span class="mini-luck-num" :style="{ color: result.color.hex }">{{ result.luck }}</span>
              <span class="mini-luck-label">幸运值</span>
            </div>
            <div class="mini-yiji">
              <div class="mini-yi"><span class="yj-tag">宜</span><span class="yj-val">{{ result.yi }}</span></div>
              <div class="mini-ji"><span class="yj-tag">忌</span><span class="yj-val">{{ result.ji }}</span></div>
            </div>
            <RouterLink to="/fortune" class="mini-more">查看完整运势 →</RouterLink>
          </div>
        </transition>
      </div>
    </template>

    <!-- ===== 贪吃蛇 tab: 迷你入口 ===== -->
    <template v-else>
      <div class="mini-head">
        <span class="mini-title">🐍 贪吃蛇</span>
        <span class="mini-date">经典小游戏</span>
      </div>
      <div class="snake-entry">
        <p class="snake-desc">吃豆子变长, 别撞墙、别咬到自己</p>
        <RouterLink to="/snake" class="snake-play">开始游戏 →</RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fortune-mini {
  padding: 14px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- 双标签栏(对齐顶部导航 nav-item 风格) ---- */
.mini-tabs {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 2px;
}
.mini-tab {
  background: none;
  border: none;
  padding: 6px 10px;
  color: rgba(238, 230, 255, 0.68);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.02em;
  cursor: pointer;
  position: relative;
  transition: color var(--transition);
}
.mini-tab::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -2px;
  width: 0;
  height: 1px;
  background: currentColor;
  opacity: 0.7;
  transition: width var(--transition), left var(--transition);
}
.mini-tab:hover { color: #fff; }
.mini-tab:hover::after { width: 60%; left: 20%; }
.mini-tab.active { color: #fff; font-weight: 500; }
.mini-tab.active::after { width: 60%; left: 20%; }

/* ---- 公共头部行 ---- */
.mini-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mini-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.02em;
}
.mini-date {
  font-size: 11px;
  color: rgba(220, 212, 240, 0.5);
  letter-spacing: 0.12em;
}

/* ---- 抽签卡 ---- */
.mini-card-wrap { perspective: 900px; }
.mini-card {
  position: relative;
  border-radius: 12px;
  padding: 18px 16px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  user-select: none;
}

/* 卡背 */
.mini-back {
  cursor: pointer;
  background:
    radial-gradient(circle at 30% 30%, rgba(124, 108, 240, 0.28), transparent 65%),
    radial-gradient(circle at 70% 75%, rgba(74, 168, 255, 0.18), transparent 65%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform var(--transition);
}
.mini-back:hover { transform: translateY(-2px); }
.mini-hint {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(220, 212, 240, 0.72);
}

/* 抖动 */
.shake { animation: shakeY 0.72s cubic-bezier(.36,.07,.19,.97) both; }
@keyframes shakeY {
  10%, 90% { transform: translate3d(0, -2px, 0) rotate(-1deg); }
  20%, 80% { transform: translate3d(0,  3px, 0) rotate(1deg); }
  30%, 50%, 70% { transform: translate3d(0, -5px, 0) rotate(-2deg); }
  40%, 60% { transform: translate3d(0,  5px, 0) rotate(2deg); }
}

/* 卡正面 */
.mini-front {
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.1);
  gap: 12px;
}
.mini-level {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 14px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.06em;
  border: 1px solid;
}
.lvl-great { color: #ffd588; border-color: rgba(255, 213, 136, 0.55); background: rgba(255, 180, 80, 0.18); }
.lvl-mid   { color: #ff9dbb; border-color: rgba(255, 157, 187, 0.5);  background: rgba(255, 107, 157, 0.15); }
.lvl-slight{ color: #b9e4c6; border-color: rgba(185, 228, 198, 0.5); background: rgba(52, 211, 153, 0.15); }
.lvl-ok    { color: #a9d0ff; border-color: rgba(169, 208, 255, 0.5); background: rgba(74, 168, 255, 0.14); }
.lvl-end   { color: #cdbfff; border-color: rgba(205, 191, 255, 0.5); background: rgba(124, 108, 240, 0.14); }

.mini-luck-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.mini-luck-num {
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 2px 12px currentColor;
}
.mini-luck-label {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: rgba(220, 212, 240, 0.56);
}

.mini-yiji {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mini-yi, .mini-ji {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
}
.yj-tag {
  flex-shrink: 0;
  width: 18px; height: 18px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
.mini-yi .yj-tag { background: rgba(52, 211, 153, 0.2); color: #b9e4c6; }
.mini-ji .yj-tag { background: rgba(255, 107, 157, 0.2); color: #ffb8c6; }
.yj-val {
  color: rgba(240, 234, 255, 0.9);
  font-weight: 500;
}

.mini-more {
  margin-top: 2px;
  font-size: 11px;
  color: rgba(220, 212, 240, 0.65);
  text-decoration: none;
  letter-spacing: 0.04em;
  transition: color var(--transition);
}
.mini-more:hover { color: #fff; }

/* 翻面过渡 */
.mini-flip-enter-active, .mini-flip-leave-active {
  transition: transform 0.4s ease, opacity 0.3s ease;
}
.mini-flip-enter-from { transform: rotateY(-90deg); opacity: 0; }
.mini-flip-leave-to   { transform: rotateY(90deg);  opacity: 0; }

/* ---- 贪吃蛇入口 ---- */
.snake-entry {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border-radius: 12px;
  background:
    radial-gradient(circle at 30% 30%, rgba(52, 211, 153, 0.16), transparent 65%),
    radial-gradient(circle at 70% 75%, rgba(255, 107, 157, 0.14), transparent 65%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.snake-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
  color: rgba(220, 212, 240, 0.72);
}
.snake-play {
  padding: 8px 22px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c6cf0, #4aa8ff);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.04em;
  box-shadow: 0 6px 18px rgba(124, 108, 240, 0.35);
  transition: transform var(--transition), box-shadow var(--transition);
}
.snake-play:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124, 108, 240, 0.45);
}
</style>
