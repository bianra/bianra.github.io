// 文件服务: 魔数校验 (file-type) + 像素尺寸校验 (image-size) + uuid 落盘到 uploads/yyyyMM/
import { fileTypeFromBuffer } from 'file-type'
import imageSize from 'image-size'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { config } from '../config.js'

const ALLOWED = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
// 像素尺寸上限: 8000px (防超大图解压拖垮前端; 全站背景图通常较大, 需留足空间)
const MAX_DIMENSION = 8000

// 校验并保存图片, 返回可访问的 URL 路径; 不合法抛 400
export async function saveImage(buffer) {
  // 魔数校验 (识别真实类型, 防伪造扩展名)
  const type = await fileTypeFromBuffer(buffer)
  if (!type || !ALLOWED.has(type.ext)) {
    const err = new Error('仅支持 png/jpg/jpeg/webp/gif, 且 ≤5MB')
    err.status = 400
    throw err
  }

  // 像素尺寸校验 (防解压炸弹)
  try {
    const size = imageSize(buffer)
    if (size.width > MAX_DIMENSION || size.height > MAX_DIMENSION) {
      const err = new Error(`图片尺寸过大 (≤${MAX_DIMENSION}px)`)
      err.status = 400
      throw err
    }
  } catch (e) {
    if (e.status === 400) throw e
    // 尺寸解析失败 (极小/异常文件) 也拒绝
    const err = new Error('无法解析图片尺寸')
    err.status = 400
    throw err
  }

  // 按年月分目录: uploads/yyyyMM/uuid.ext
  const ym = new Date().toISOString().slice(0, 7).replace('-', '')
  const dir = path.join(config.uploadsDir, ym)
  await fs.mkdir(dir, { recursive: true })
  const filename = `${randomUUID().slice(0, 16)}.${type.ext}`
  await fs.writeFile(path.join(dir, filename), buffer)

  return `/uploads/${ym}/${filename}`
}
