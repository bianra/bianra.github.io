/**
 * 贪吃蛇纯游戏逻辑模块 (零 DOM 依赖, 全部为纯函数)
 * 状态对象不可变更新, step 等操作均返回新对象, 不修改入参
 */

// ---------- 常量池 ----------

/** 方向常量: 每个方向为 {x, y} 坐标偏移 */
export const DIR = {
  UP:   { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

/** 初始速度 (ms/格) */
const BASE_SPEED = 150

/** 速度下限 (ms/格) */
const MIN_SPEED = 60

/** 每吃到一个食物增加的分数 */
const FOOD_SCORE = 10

/** 小写方向名 → 方向向量 (dir/nextDir 使用小写名, DIR 常量键为大写) */
export const DIR_BY_NAME = {
  up: DIR.UP,
  down: DIR.DOWN,
  left: DIR.LEFT,
  right: DIR.RIGHT,
}

// ---------- 辅助函数 ----------

/** 随机整数 [min, max) */
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min))
}

/**
 * 根据分数计算速度: 每 5 分减 10ms, 下限 60, 基础 150
 * @param {number} score 当前分数
 * @returns {number} 速度 (ms/格)
 */
export function speedForScore(score) {
  return Math.max(MIN_SPEED, BASE_SPEED - Math.floor(score / 5) * 10)
}

/**
 * 坐标是否在蛇身上
 * @param {object} state 游戏状态
 * @param {number} x 横坐标
 * @param {number} y 纵坐标
 * @returns {boolean} 是否在蛇身上
 */
export function snakeHas(state, x, y) {
  return state.snake.some(([sx, sy]) => sx === x && sy === y)
}

// ---------- 核心逻辑 ----------

/**
 * 创建新游戏状态
 * @param {number} [cols=20] 列数 (宽)
 * @param {number} [rows=20] 行数 (高)
 * @returns {object} 状态对象 { cols, rows, snake, dir, nextDir, food, score, speed, status }
 */
export function createGame(cols = 20, rows = 20) {
  const half = Math.floor(cols / 2)
  const y = Math.floor(rows / 2)
  const snake = [
    [half, y],
    [half - 1, y],
    [half - 2, y],
  ]
  const state = {
    cols,
    rows,
    snake,
    dir: 'right',
    nextDir: 'right',
    food: null,
    score: 0,
    speed: BASE_SPEED,
    status: 'idle',
  }
  state.food = spawnFood(state)
  return state
}

/**
 * 在空格随机生成新食物 (不与蛇重叠)
 * @param {object} state 游戏状态
 * @returns {[number, number] | null} 食物坐标; 无空格时返回 null
 */
export function spawnFood(state) {
  const { cols, rows, snake } = state
  const free = []
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (!snakeHas(state, x, y)) free.push([x, y])
    }
  }
  if (!free.length) return null
  return free[randInt(0, free.length)]
}

/**
 * 设置方向: 合法方向更新 nextDir; 拒绝 180° 反向
 * 当 status==='idle' 时调用会启动游戏并应用该方向
 * @param {object} state 游戏状态
 * @param {string} dir 方向键 ('up' | 'down' | 'left' | 'right')
 * @returns {object} 新状态 (不可变更新)
 */
export function setDirection(state, dir) {
  if (!(dir in DIR_BY_NAME)) return state
  if (state.status === 'over') return state

  const cur = DIR_BY_NAME[state.nextDir]
  const next = DIR_BY_NAME[dir]
  if (cur.x + next.x === 0 && cur.y + next.y === 0) return state

  if (state.status === 'idle') {
    return {
      ...state,
      dir,
      nextDir: dir,
      status: 'running',
    }
  }
  return { ...state, nextDir: dir }
}

/**
 * 前进一步 (仅 status==='running' 时有效, 否则原样返回)
 * @param {object} state 游戏状态
 * @returns {object} 新状态 (不可变更新)
 */
export function step(state) {
  if (state.status !== 'running') return state

  const { cols, rows, snake, nextDir } = state
  const delta = DIR_BY_NAME[nextDir]
  const head = snake[0]
  const nx = head[0] + delta.x
  const ny = head[1] + delta.y

  // 撞墙 (越界)
  if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
    return { ...state, status: 'over' }
  }

  const newSnake = [[nx, ny], ...snake]
  const next = { ...state, snake: newSnake, dir: nextDir, nextDir }

  // 本步是否吃到食物: 吃到时尾部不移除, 旧尾格仍属身体
  const willEat = state.food && state.food[0] === nx && state.food[1] === ny

  // 撞自身 (头部与身体任一格重叠; 未吃到时尾部本步会被移除, 故排除)
  const body = willEat ? snake : snake.slice(0, -1)
  if (body.some(([sx, sy]) => sx === nx && sy === ny)) {
    return { ...state, snake: newSnake, dir: nextDir, status: 'over' }
  }

  // 吃到食物
  if (willEat) {
    const score = state.score + FOOD_SCORE
    const food = spawnFood({ ...next })
    return { ...next, score, food, speed: speedForScore(score) }
  }

  // 未吃到: 尾部移除
  newSnake.pop()
  return next
}

/**
 * 暂停/继续切换: 'running' ↔ 'paused'
 * @param {object} state 游戏状态
 * @returns {object} 新状态 (不可变更新)
 */
export function togglePause(state) {
  if (state.status === 'running') return { ...state, status: 'paused' }
  if (state.status === 'paused') return { ...state, status: 'running' }
  return state
}
