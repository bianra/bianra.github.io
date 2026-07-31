// multer 上传中间件: 内存接收 (5MB 限制), 落盘与魔数校验交由 fileService
import multer from 'multer'

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})
