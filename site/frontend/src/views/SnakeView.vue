<script setup>
// 贪吃蛇页面: 标题 + 计分 + 游戏面板 + 操作说明
import { ref, onMounted } from 'vue'
import SnakeGame from '../components/SnakeGame.vue'

const BEST_KEY = 'bianra_snake_best'
const gameRef = ref(null)
const score = ref(0)
const best = ref(readBest())

function readBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 }
}

function onScore(v) {
  score.value = v
  // 组件内部会在 over 时写回 localStorage; 这里同步刷新最高分显示
  const b = readBest()
  if (b > best.value) best.value = b
}

function reset() {
  score.value = 0
  gameRef.value?.reset()
}

function toggle() {
  gameRef.value?.toggle()
}

onMounted(() => {
  best.value = readBest()
})
</script>

<template>
  <div class="snake-root">
    <div class="snake-container">
      <header class="page-header light-card">
        <h1 class="page-title">🐍 贪吃蛇</h1>
        <p class="page-sub">经典小游戏 · 吃豆子变长, 别撞墙别咬到自己</p>
      </header>

      <div class="score-bar light-card">
        <div class="score-item">
          <span class="score-label">本局</span>
          <span class="score-num score-cur">{{ score }}</span>
        </div>
        <div class="score-item">
          <span class="score-label">最高</span>
          <span class="score-num">{{ best }}</span>
        </div>
      </div>

      <div class="game-wrap light-card">
        <SnakeGame ref="gameRef" @score="onScore" />
        <div class="game-actions">
          <button class="snake-btn" @click="toggle">⏸ 暂停/继续</button>
          <button class="snake-btn" @click="reset">🔄 重新开始</button>
        </div>
      </div>

      <div class="howto light-card">
        <div class="howto-item">⌨️ <b>键盘</b>:方向键 / WASD 移动 · 空格 暂停 · 回车 重开</div>
        <div class="howto-item">📱 <b>触控</b>:在棋盘上滑动转向</div>
        <div class="howto-item">💡 每吃 5 个食物速度提升一档, 最高分保存在本地浏览器</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.snake-root {
  padding: 88px 0 64px;
  min-height: 100vh;
}
.snake-container {
  max-width: 520px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  padding: 20px 24px;
  text-align: center;
}
.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #fff;
}
.page-sub {
  margin: 6px 0 0;
  font-size: var(--fs-sm);
  color: rgba(220, 212, 240, 0.65);
}

.score-bar {
  display: flex;
  justify-content: center;
  gap: 48px;
  padding: 14px 24px;
}
.score-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.score-label {
  font-size: var(--fs-xs);
  letter-spacing: 0.1em;
  color: rgba(220, 212, 240, 0.55);
}
.score-num {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
}
.score-cur {
  color: #ff9dbb;
}

.game-wrap {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.game-actions {
  display: flex;
  gap: 10px;
}
.snake-btn {
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(124, 108, 240, 0.45);
  background: rgba(124, 108, 240, 0.16);
  color: #fff;
  font-size: var(--fs-sm);
  cursor: pointer;
  transition: background var(--transition), transform var(--transition);
}
.snake-btn:hover {
  background: rgba(124, 108, 240, 0.32);
  transform: translateY(-1px);
}

.howto {
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.howto-item {
  font-size: var(--fs-xs);
  line-height: 1.5;
  color: rgba(220, 212, 240, 0.7);
}
.howto-item b {
  color: rgba(240, 234, 255, 0.92);
}

@media (max-width: 640px) {
  .snake-root { padding: 76px 0 48px; }
  .score-bar { gap: 32px; }
}
</style>
