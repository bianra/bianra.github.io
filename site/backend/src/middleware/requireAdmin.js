// 鉴权中间件: 校验 session.isAdmin, 未登录返回 401
export function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next()
  }
  res.status(401).json({ error: '未登录' })
}
