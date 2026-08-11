<script setup>
// 贪吃蛇游戏组件: Canvas 渲染 + 键盘/触控输入 + rAF 游戏循环
// 游戏逻辑全部来自 ../utils/snake.js 纯函数, 组件只负责渲染与输入
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { createGame, setDirection, step, togglePause, DIR_BY_NAME } from '../utils/snake.js'

const props = defineProps({
  cols: { type: Number, default: 20 },
  rows: { type: Number, default: 20 },
})
const emit = defineEmits(['score'])

const canvasRef = ref(null)
const state = ref(createGame(props.cols, props.rows))

const BEST_KEY = 'bianra_snake_best'
// localStorage 读写降级(隐私模式/禁用存储时不白屏, 对齐 fortune.js 先例)
function readBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) } catch { return 0 }
}
function writeBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)) } catch { /* 忽略 */ }
}
let bestScore = readBest()
let bestSynced = false // 本局是否已结算最高分(over 只结算一次)

// ---- 游戏循环: rAF + 累积时间, 每达到 state.speed 前进一格 ----
let raf = 0
let last = 0
let acc = 0

function loop(now) {
  raf = requestAnimationFrame(loop)
  if (last === 0) last = now
  const dt = now - last
  last = now

  if (state.value.status === 'running') {
    acc += dt
    let guard = 0 // 防卡死: 单帧最多前进 5 格(帧率骤降时)
    while (acc >= state.value.speed && guard < 5) {
      acc -= state.value.speed
      state.value = step(state.value)
      emit('score', state.value.score)
      if (state.value.status === 'over') break
      guard++
    }
    if (state.value.status !== 'running') acc = 0
  }
  draw(state.value)
}

// ---- 渲染: 每帧全量重绘 ----
function draw(s) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  // 高清屏: 按 devicePixelRatio 放大画布, 绘制时坐标不变
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = s.cols * 20
  const H = s.rows * 20
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  const w = W
  const h = H
  const cell = w / s.cols

  ctx.clearRect(0, 0, w, h)

  // 棋盘背景(深色半透明) + 格子细线
  ctx.fillStyle = 'rgba(20, 16, 40, 0.35)'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.lineWidth = 1
  for (let x = 1; x < s.cols; x++) {
    ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, h); ctx.stroke()
  }
  for (let y = 1; y < s.rows; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(w, y * cell); ctx.stroke()
  }

  // 食物: 薄荷绿圆点 + 内发光
  if (s.food) {
    const [fx, fy] = s.food
    const cx = fx * cell + cell / 2
    const cy = fy * cell + cell / 2
    const r = cell * 0.32
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r)
    g.addColorStop(0, '#8ef0c0')
    g.addColorStop(1, '#34d399')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  }

  // 蛇: 紫色渐变(按索引), 蛇头亮粉 + 眼睛
  const n = s.snake.length
  s.snake.forEach(([sx, sy], i) => {
    const x = sx * cell + 1
    const y = sy * cell + 1
    const size = cell - 2
    const t = n === 1 ? 0 : i / (n - 1)
    // 蛇身 #7c6cf0 → #4aa8ff 渐变; 蛇头 #ff6b9d
    const head = i === 0
    const color = head
      ? '#ff6b9d'
      : `rgb(${Math.round(124 + (74 - 124) * t)}, ${Math.round(108 + (168 - 108) * t)}, ${Math.round(240 + (255 - 240) * t)})`
    ctx.fillStyle = color
    roundRect(ctx, x, y, size, size, Math.min(5, size / 3))
    ctx.fill()

    // 蛇头眼睛: 按当前方向定位两个白点
    if (head) {
      const d = DIRV[s.dir] || DIRV.right
      const ex = x + size / 2
      const ey = y + size / 2
      const eyeR = Math.max(1.5, cell * 0.07)
      const off = cell * 0.18
      const fwd = cell * 0.22 // 眼睛向前偏移
      const pts = [
        { x: ex + d.x * fwd - (d.y !== 0 ? off : 0), y: ey + d.y * fwd + (d.x !== 0 ? off : 0) },
        { x: ex + d.x * fwd + (d.y !== 0 ? off : 0), y: ey + d.y * fwd - (d.x !== 0 ? off : 0) },
      ]
      ctx.fillStyle = '#fff'
      pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, eyeR, 0, Math.PI * 2); ctx.fill() })
    }
  })

  // 状态遮罩(idle / paused / over)
  if (s.status !== 'running') {
    ctx.fillStyle = 'rgba(12, 8, 26, 0.72)'
    ctx.fillRect(0, 0, w, h)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const midY = h / 2
    if (s.status === 'idle') {
      ctx.fillStyle = '#e8ecf4'
      ctx.font = '600 20px system-ui, sans-serif'
      ctx.fillText('贪吃蛇', w / 2, midY - 26)
      ctx.fillStyle = 'rgba(232, 236, 244, 0.72)'
      ctx.font = '13px system-ui, sans-serif'
      ctx.fillText('按方向键 / 滑动开始', w / 2, midY + 12)
    } else if (s.status === 'paused') {
      ctx.fillStyle = 'rgba(232, 236, 244, 0.9)'
      ctx.font = '600 22px system-ui, sans-serif'
      ctx.fillText('已暂停', w / 2, midY)
      ctx.fillStyle = 'rgba(232, 236, 244, 0.6)'
      ctx.font = '13px system-ui, sans-serif'
      ctx.fillText('按 空格 继续', w / 2, midY + 28)
    } else if (s.status === 'over') {
      ctx.fillStyle = '#ff9dbb'
      ctx.font = '700 22px system-ui, sans-serif'
      ctx.fillText('游戏结束', w / 2, midY - 30)
      ctx.fillStyle = '#e8ecf4'
      ctx.font = '600 16px system-ui, sans-serif'
      ctx.fillText(`本局得分: ${s.score}`, w / 2, midY)
      ctx.fillStyle = 'rgba(232, 236, 244, 0.6)'
      ctx.font = '13px system-ui, sans-serif'
      ctx.fillText('回车 或 点击按钮 再来一局', w / 2, midY + 30)
    }
  }
}

// 方向字符串 → 向量(复用 snake.js 的 DIR_BY_NAME, 供眼睛定位用)
const DIRV = DIR_BY_NAME

// 圆角矩形路径
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ---- 输入 ----
const KEY_DIR = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
}

function onKeydown(e) {
  // 焦点在按钮/输入框上时, 空格/回车属于按钮操作, 不劫持为游戏按键
  const t = e.target
  if (t instanceof HTMLButtonElement || t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return
  const dir = KEY_DIR[e.key]
  if (dir) {
    e.preventDefault()
    state.value = setDirection(state.value, dir)
    return
  }
  if (e.key === ' ') {
    e.preventDefault()
    state.value = togglePause(state.value)
  } else if (e.key === 'Enter') {
    reset()
  }
}

// 触控: 记录起点, 松手时按 dominant 方向判定
let touchStart = null

function onTouchStart(e) {
  const t = e.touches[0]
  if (t) touchStart = { x: t.clientX, y: t.clientY }
}

function onTouchEnd(e) {
  if (!touchStart) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStart.x
  const dy = t.clientY - touchStart.y
  touchStart = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return // 阈值, 防误触
  const dir = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down' : 'up')
  state.value = setDirection(state.value, dir)
}

// ---- 对外操作(父组件按钮用) ----
function reset() {
  state.value = createGame(props.cols, props.rows)
  bestSynced = false
  acc = 0
  last = 0 // 下一帧重新校准时间基准, 防止残留 dt 造成启动连走
}
function toggle() {
  state.value = togglePause(state.value)
}

// over 结算最高分: 状态机保证只触发一次
watch(
  () => state.value.status,
  (s) => {
    if (s === 'over' && !bestSynced) {
      bestSynced = true
      const sc = state.value.score
      if (sc > bestScore) {
        bestScore = sc
        writeBest(bestScore)
      }
      // 结算完成后补发, 让父页面重新读 localStorage 刷新最高分显示
      emit('score', sc)
    }
  }
)

defineExpose({ reset, toggle })

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  const canvas = canvasRef.value
  canvas?.addEventListener('touchstart', onTouchStart, { passive: true })
  canvas?.addEventListener('touchend', onTouchEnd, { passive: true })
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  const canvas = canvasRef.value
  canvas?.removeEventListener('touchstart', onTouchStart)
  canvas?.removeEventListener('touchend', onTouchEnd)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="cols * 20"
    :height="rows * 20"
    class="snake-canvas"
    aria-label="贪吃蛇游戏"
  ></canvas>
</template>

<style scoped>
.snake-canvas {
  display: block;
  width: 100%;
  max-width: 440px;
  height: auto;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--shadow, 0 8px 30px rgba(31, 36, 48, 0.08));
  touch-action: none; /* 防止滑动时页面滚动 */
  user-select: none;
}
</style>
