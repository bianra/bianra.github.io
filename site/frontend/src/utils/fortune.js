/**
 * 每日抽签纯函数 (无副作用, 纯前端本地生成)
 * 种子: identity + "|" + 本地日期 + "|bianra-tea"
 * 同一 identity 在同一天结果恒定, 次日自动变化
 */
import { todayLocalStr, fnv1a } from './date.js'

export { todayLocalStr, fnv1a } // re-export 保持旧引用兼容

// ---------- 常量池 ----------
export const YI_POOL = [
  '整理书桌', '喝一杯温水', '提前十分钟出发', '听一首喜欢的歌',
  '给朋友发条消息', '给自己买杯奶茶', '出门带伞', '整理一件旧物',
  '尝试新路线通勤', '写三句感恩', '午休时散步十分钟', '早一点放下手机'
]

export const JI_POOL = [
  '熬夜写码', '空腹喝咖啡', '冲动购物', '点超过三个菜',
  '拖延到最后一刻', '久坐不喝水', '和家人抬杠', '刷推荐超过 30 分钟',
  '凌晨刷社交软件', '用情绪做决定', '丢伞/丢耳机', '忘了吃饭'
]

export const COLORS = [
  { name: '暮山紫', hex: '#8b6cdc' },
  { name: '天水碧', hex: '#6cc2c8' },
  { name: '月白',   hex: '#dfe8f5' },
  { name: '青竹',   hex: '#77c68c' },
  { name: '苍粉',   hex: '#e9a9c3' },
  { name: '玄金',   hex: '#c9a757' },
  { name: '夜海',   hex: '#3a5b99' },
  { name: '樱色',   hex: '#f5a6b0' },
]

export const HOURS = [
  '辰时 (7–9 点)',  '巳时 (9–11 点)',  '午时 (11–13 点)', '未时 (13–15 点)',
  '申时 (15–17 点)', '酉时 (17–19 点)', '戌时 (19–21 点)', '亥时 (21–23 点)',
]

export const TEAS = [
  '一杯茶的时间，也是时间。',
  '风会记得一朵花的香。',
  '慢慢来，比较快。',
  '愿你拥有被讨厌的勇气。',
  '今天的月亮，是我想你的邮戳。',
  '把今天过成绝版。',
  '愿我们都有不赶时间的下午。',
  '世界很大，别在原地长大。',
]

// ---------- 纯函数 ----------

/** mulberry32 确定性 PRNG */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function rand() {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 从数组抽一项 */
function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)]
}

/** 从数组抽两项不重复 */
function pickTwo(rand, arr) {
  const copy = arr.slice()
  const i1 = Math.floor(rand() * copy.length)
  const a = copy.splice(i1, 1)[0]
  const i2 = Math.floor(rand() * copy.length)
  const b = copy[i2]
  return [a, b]
}

/** 返回吉凶档位(大吉/中吉/小吉/吉/末吉) */
function levelOf(luck) {
  if (luck >= 95) return '大吉'
  if (luck >= 85) return '中吉'
  if (luck >= 70) return '小吉'
  if (luck >= 60) return '吉'
  return '末吉'
}

/**
 * 主函数: 每日固定结果
 * @param {string} identity  本地用户唯一 ID (localStorage)
 * @param {string} dateStr   YYYY-MM-DD (本地日期)
 */
export function rollFortune(identity, dateStr) {
  const idKey = typeof identity === 'string' && identity.length ? identity : 'anon'
  const seed = fnv1a(`${idKey}|${dateStr}|bianra-tea`)
  const rand = mulberry32(seed)

  const [yi, ji] = pickTwo(rand, YI_POOL)
  const color = pick(rand, COLORS)
  const hour  = pick(rand, HOURS)
  const tea   = pick(rand, TEAS)
  const luck  = 52 + Math.floor(rand() * 48)   // 52 - 99

  return {
    yi, ji,
    color,
    luckyHour: hour,
    tea,
    luck,
    level: levelOf(luck),
    date: dateStr,
  }
}

/** 获取或生成 identity (localStorage 永久) */
const ID_KEY = 'bianra_fortune_id'
export function getIdentity() {
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem(ID_KEY, id)
    }
    return id
  } catch (_) {
    // localStorage 不可用时降级到日期稳定 fallback
    return 'fallback-user'
  }
}
