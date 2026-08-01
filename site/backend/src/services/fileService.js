// 文件服务: 魔数校验 (file-type) + 像素尺寸校验 (image-size) + 存数据库
// 存数据库原因: Render 免费实例磁盘每次部署重置, 存 DB 图片不丢
import { fileTypeFromBuffer } from 'file-type'
import imageSize from 'image-size'

import { prisma } from '../db.js'

const ALLOWED = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
// 像素尺寸上限: 8000px (防超大图解压拖垮前端; 全站背景图通常较大, 需留足空间)
const MAX_DIMENSION = 8000

// 校验并保存图片到数据库, 返回可访问的 URL 路径; 不合法抛 400
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

  // 存入数据库
  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }
  const upload = await prisma.upload.create({
    data: { mime: mimeMap[type.ext] || 'application/octet-stream', data: buffer },
  })

  return `/uploads/${upload.id}`
}

// 按 id 读取文件 (不存在返回 null)
export async function getUpload(id) {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) return null
  return prisma.upload.findUnique({ where: { id: n } })
}
