/** 本地日期工具 (fortune / quotes 共用) */

/** 获取本地日期字符串 (YYYY-MM-DD) */
export function todayLocalStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 32-bit FNV-1a 字符串哈希 → number (确定性, 用于每日固定选择) */
export function fnv1a(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}
