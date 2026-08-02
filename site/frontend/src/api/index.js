// 统一 API 封装 (fetch 封装 + 超时 + 401 登出)
// 公开站 -> publicApi, 后台 -> adminApi

const TIMEOUT_MS = 15000

// 生产环境用同源(同部署域名), dev 走 vite proxy 到 localhost:3000
const BASE_URL = '' // 空字符串 = 相对路径, 由 dev proxy 转发

async function request(path, { method = 'GET', body, signal, multipart = false, auth = false } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  // 合并外部 signal
  const outer = signal || null
  if (outer) {
    if (outer.aborted) controller.abort()
    outer.addEventListener?.('abort', () => controller.abort(), { once: true })
  }

  const headers = {}
  let payload

  if (multipart) {
    // FormData 让浏览器自动设 Content-Type (含 boundary)
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  try {
    const res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: payload,
      credentials: 'include', // 带 cookie (session)
      signal: controller.signal,
    })

    // 401: auth 错误, 通过全局自定义事件通知 store
    if (res.status === 401) {
      const err = await parseMaybeJson(res)
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('api:401'))
      })
      const e = new Error(err?.error || '未登录')
      e.status = 401
      throw e
    }

    if (!res.ok) {
      const err = await parseMaybeJson(res)
      const e = new Error(err?.error || `请求失败 (${res.status})`)
      e.status = res.status
      throw e
    }

    // 按 Content-Type 解析
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) return res.json()
    return res.text()
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('请求超时, 请稍后重试')
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

async function parseMaybeJson(res) {
  try { return await res.json() } catch { return {} }
}

/* ===== 公开 API ===== */
export const publicApi = {
  getProfile: () => request('/api/profile'),
  listArticles: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/api/articles${q ? '?' + q : ''}`)
  },
  getArticle: (id) => request(`/api/articles/${id}`),
  getFeed: () => request('/api/feed.xml'),
  getCategoryCounts: () => request('/api/category-counts'),
  getTagCloud: () => request('/api/tag-cloud'),
  health: () => request('/health'),
}

/* ===== 后台 API ===== */
export const adminApi = {
  login: ({ username, password }) =>
    request('/admin/api/login', { method: 'POST', body: { username, password } }),

  logout: () =>
    request('/admin/api/logout', { method: 'POST', auth: true }),

  checkAuth: () =>
    request('/admin/api/check-auth', { auth: true }),

  stats: () => request('/admin/api/stats', { auth: true }),

  listArticles: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/admin/api/articles${q ? '?' + q : ''}`, { auth: true })
  },

  createArticle: (data) =>
    request('/admin/api/articles', { method: 'POST', body: data, auth: true }),

  updateArticle: (id, data) =>
    request(`/admin/api/articles/${id}`, { method: 'PUT', body: data, auth: true }),

  deleteArticle: (id) =>
    request(`/admin/api/articles/${id}`, { method: 'DELETE', auth: true }),

  deleteArticles: (ids) =>
    request('/admin/api/articles', { method: 'DELETE', body: { ids }, auth: true }),

  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return request('/admin/api/upload', { method: 'POST', body: fd, multipart: true, auth: true })
  },

  getSettings: () => request('/admin/api/settings', { auth: true }),

  updateSettings: (data) =>
    request('/admin/api/settings', { method: 'PUT', body: data, auth: true }),

  changePassword: ({ oldPassword, newPassword }) =>
    request('/admin/api/settings/password', {
      method: 'PUT',
      body: { oldPassword, newPassword },
      auth: true,
    }),
}
