<script setup>
// 每日抽签: 纯前端本地生成, 同 identity 在同一天结果恒定, 次日自动变
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { getIdentity, todayLocalStr, rollFortune } from '../utils/fortune.js'

const today = todayLocalStr()
const identity = getIdentity()

// 状态: idle 未抽 / shaking 抖动中 / revealed 结果揭示
const phase = ref('idle')        // 'idle' | 'shaking' | 'revealed'
const result = ref(null)

function doRoll() {
  if (phase.value === 'shaking') return
  // 计算结果先准备好 (保持"当天恒定")
  result.value = rollFortune(identity, today)
  phase.value = 'shaking'
  // 抖动动画 720ms → reveal
  setTimeout(() => {
    phase.value = 'revealed'
  }, 720)
}

// 摇手机触发 (devicemotion)
let lastShakeAt = 0
function onDeviceMotion(e) {
  if (phase.value === 'shaking' || phase.value === 'revealed') return
  const a = e.accelerationIncludingGravity || e.acceleration
  if (!a) return
  const total = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0)
  const now = Date.now()
  if (total > 28 && now - lastShakeAt > 600) {
    lastShakeAt = now
    doRoll()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
    // iOS 13+ 需要权限: 先静默监听, 用户主动点按钮后也能触发
    try {
      window.addEventListener('devicemotion', onDeviceMotion)
    } catch (_) { /* 忽略 */ }
  }
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('devicemotion', onDeviceMotion)
})

const levelCls = computed(() => {
  switch (result.value?.level) {
    case '大吉': return 'lvl-great'
    case '中吉': return 'lvl-mid'
    case '小吉': return 'lvl-slight'
    case '吉':   return 'lvl-ok'
    default:     return 'lvl-end'
  }
})

const dateStr = computed(() => {
  const [y, m, d] = today.split('-')
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
})
</script>

<template>
  <div class="fortune-root">
    <div class="fortune-container">
      <header class="page-header light-card">
        <h1 class="page-title">🍵 每日抽签</h1>
        <p class="page-sub">今日的小运势 · {{ dateStr }}</p>
        <p class="privacy">结果仅在您的浏览器本地生成，不会上传到任何服务器</p>
      </header>

      <div class="card-wrap">
        <!-- 未抽 / 抖动中: 卡背 -->
        <div
          v-if="phase === 'idle' || phase === 'shaking'"
          class="fortune-card light-card card-back"
          :class="{ shake: phase === 'shaking' }"
          @click="doRoll"
        >
          <div class="back-inner">
            <div class="back-pattern" aria-hidden="true"></div>
            <div class="back-center">
              <div class="card-hint">{{ phase === 'shaking' ? '抽取中…' : '点击卡片 或 摇一摇' }}</div>
            </div>
          </div>
        </div>

        <!-- 结果揭示: 卡正面 -->
        <transition name="flip" mode="out-in">
          <div v-if="phase === 'revealed'" class="fortune-card light-card card-front" :key="'front-' + today">
            <div class="front-inner">
              <div class="front-top">
                <div class="date-label" aria-hidden="true">{{ today.slice(5) }}</div>
                <div class="level-badge" :class="levelCls">{{ result.level }}</div>
              </div>

              <div class="luck-row">
                <div class="luck-num" :style="{ color: result.color.hex }">{{ result.luck }}</div>
                <div class="luck-label">
                  <div class="luck-title">今日幸运值</div>
                  <div class="luck-bar">
                    <div class="luck-fill" :style="{ width: result.luck + '%', background: result.color.hex }"></div>
                  </div>
                </div>
              </div>

              <div class="grid">
                <div class="cell cell-yi">
                  <div class="cell-title">宜</div>
                  <div class="cell-val">{{ result.yi }}</div>
                </div>
                <div class="cell cell-ji">
                  <div class="cell-title">忌</div>
                  <div class="cell-val">{{ result.ji }}</div>
                </div>
                <div class="cell cell-color">
                  <div class="cell-title">幸运色</div>
                  <div class="cell-val">
                    <span class="color-chip" :style="{ background: result.color.hex }"></span>
                    {{ result.color.name }}
                  </div>
                </div>
                <div class="cell cell-hour">
                  <div class="cell-title">吉时</div>
                  <div class="cell-val">{{ result.luckyHour }}</div>
                </div>
              </div>

              <div class="tea-box">
                <div class="tea-mark">❝</div>
                <div class="tea-text">{{ result.tea }}</div>
              </div>

              <div class="front-foot">
                <button class="roll-again" @click="doRoll">重新抽一次（结果不变）</button>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <p v-if="phase === 'idle'" class="tip">📱 移动端可开启重力感应，摇手机也能抽签</p>
    </div>
  </div>
</template>

<style scoped>
.fortune-root {
  min-height: 100vh;
  width: 100%;
  padding: 96px 0 96px;
  background:
    radial-gradient(ellipse 70% 50% at 20% 15%, #3a1e72 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 85% 85%, rgba(150, 50, 200, 0.45) 0%, transparent 60%),
    linear-gradient(160deg, #2a1454 0%, #12072b 45%, #0a0516 100%);
  background-attachment: fixed;
}
.fortune-container {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: stretch;
}

.page-header {
  padding: 24px 28px;
  text-align: center;
}
.page-title {
  margin: 0 0 4px;
  font-size: 26px;
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.page-sub {
  margin: 0;
  font-size: 13px;
  color: rgba(220, 212, 240, 0.78);
}
.privacy {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(220, 212, 240, 0.5);
  letter-spacing: 0.02em;
}

/* 卡片容器 */
.card-wrap {
  perspective: 1200px;
}
.fortune-card {
  width: 100%;
  min-height: 420px;
  user-select: none;
  padding: 0;
  overflow: hidden;
  position: relative;
}

/* ---- 卡背 ---- */
.card-back {
  cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.card-back:hover { transform: translateY(-3px); }
.back-inner {
  position: relative;
  width: 100%;
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background:
    radial-gradient(circle at 20% 20%, rgba(124, 108, 240, 0.35), transparent 60%),
    radial-gradient(circle at 80% 80%, rgba(74, 168, 255, 0.25), transparent 60%);
}
.back-pattern {
  position: absolute;
  inset: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  background-image:
    linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%),
    linear-gradient(225deg, rgba(255,255,255,0.05) 25%, transparent 25%);
  background-size: 22px 22px;
  opacity: 0.9;
  pointer-events: none;
}
.back-center {
  position: relative;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.card-hint {
  font-size: 13px;
  letter-spacing: 0.1em;
  color: rgba(220, 212, 240, 0.72);
}

/* 抖动 keyframes */
.shake {
  animation: shakeY 0.72s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shakeY {
  10%, 90% { transform: translate3d(0, -2px, 0) rotate(-1deg); }
  20%, 80% { transform: translate3d(0,  4px, 0) rotate(2deg); }
  30%, 50%, 70% { transform: translate3d(0, -6px, 0) rotate(-2deg); }
  40%, 60% { transform: translate3d(0,  6px, 0) rotate(2deg); }
}

/* ---- 卡正面 ---- */
.card-front { padding: 0; }
.front-inner {
  padding: 28px 30px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.front-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.date-label {
  font-size: 12px;
  letter-spacing: 0.2em;
  color: rgba(220, 212, 240, 0.56);
}
.level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.06em;
  border: 1px solid;
  box-shadow: 0 4px 14px rgba(0,0,0,0.25) inset, 0 2px 8px rgba(0,0,0,0.2);
}
.lvl-great { color: #ffd588; border-color: rgba(255, 213, 136, 0.55); background: rgba(255, 180, 80, 0.18); }
.lvl-mid   { color: #ff9dbb; border-color: rgba(255, 157, 187, 0.5);  background: rgba(255, 107, 157, 0.15); }
.lvl-slight{ color: #b9e4c6; border-color: rgba(185, 228, 198, 0.5); background: rgba(52, 211, 153, 0.15); }
.lvl-ok    { color: #a9d0ff; border-color: rgba(169, 208, 255, 0.5); background: rgba(74, 168, 255, 0.14); }
.lvl-end   { color: #cdbfff; border-color: rgba(205, 191, 255, 0.5); background: rgba(124, 108, 240, 0.14); }

/* 幸运值 */
.luck-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 18px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
}
.luck-num {
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 14px currentColor;
}
.luck-label { flex: 1; min-width: 0; }
.luck-title {
  font-size: 12px;
  letter-spacing: 0.2em;
  color: rgba(220, 212, 240, 0.56);
  margin-bottom: 8px;
}
.luck-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
}
.luck-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(.22,1,.36,1);
  box-shadow: 0 0 12px currentColor;
}

/* 四宫格 */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.cell {
  padding: 14px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  min-width: 0;
}
.cell-title {
  font-size: 11px;
  letter-spacing: 0.24em;
  color: rgba(220, 212, 240, 0.5);
  margin-bottom: 6px;
}
.cell-val {
  color: rgba(240, 234, 255, 0.94);
  font-size: 15px;
  line-height: 1.5;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cell-yi .cell-title { color: #c2f1d1; }
.cell-ji .cell-title { color: #ffb8c6; }
.color-chip {
  width: 14px; height: 14px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.15);
}

/* 茶语 */
.tea-box {
  position: relative;
  padding: 16px 22px 16px 34px;
  background: linear-gradient(120deg, rgba(124, 108, 240, 0.18), rgba(74, 168, 255, 0.08));
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
}
.tea-mark {
  position: absolute;
  top: 6px;
  left: 12px;
  font-size: 28px;
  line-height: 1;
  color: rgba(255,255,255,0.25);
  font-family: Georgia, serif;
}
.tea-text {
  color: #fff;
  font-size: 15px;
  line-height: 1.7;
  letter-spacing: 0.01em;
}

/* 底部按钮 */
.front-foot { display: flex; justify-content: center; }
.roll-again {
  background: rgba(255,255,255,0.08);
  color: rgba(220, 212, 240, 0.82);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 8px 22px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
}
.roll-again:hover {
  background: rgba(255,255,255,0.14);
  color: #fff;
}

/* 翻页过渡 */
.flip-enter-active, .flip-leave-active {
  transition: transform 0.4s ease, opacity 0.3s ease;
}
.flip-enter-from { transform: rotateY(-90deg); opacity: 0; }
.flip-leave-to   { transform: rotateY(90deg);  opacity: 0; }

.tip {
  text-align: center;
  font-size: 12px;
  color: rgba(220, 212, 240, 0.5);
  letter-spacing: 0.04em;
  margin: -4px 0 0;
}

@media (max-width: 560px) {
  .fortune-root { padding: 72px 0 64px; }
  .fortune-container { padding: 0 14px; }
  .luck-num { font-size: 44px; }
  .front-inner { padding: 22px 18px 20px; }
  .grid { grid-template-columns: 1fr 1fr; }
  .cell-val { font-size: 14px; }
}
</style>
