<script setup>
// 迷你每日抽签 (左侧栏): 复用 fortune.js 纯函数, 点击抖动翻面看幸运值+宜忌
import { ref, computed } from 'vue'
import { getIdentity, todayLocalStr, rollFortune } from '../utils/fortune.js'

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
  </div>
</template>

<style scoped>
.fortune-mini {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

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

/* 卡片容器 */
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

/* ---- 卡背 ---- */
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

/* ---- 卡正面 ---- */
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
</style>
