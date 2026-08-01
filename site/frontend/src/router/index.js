// 路由表: 公开站 + 后台 SPA (后台统一 AdminLayout + 守卫)
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  /* ===== 公开站 ===== */
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { type: 'public' } },
  { path: '/fortune', name: 'fortune', component: () => import('../views/FortuneView.vue'), meta: { type: 'public' } },
  { path: '/post/:id', name: 'post', component: () => import('../views/PostView.vue'), meta: { type: 'public' }, props: true },

  /* ===== 后台 SPA ===== */
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { type: 'admin' },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'login', name: 'admin-login', component: () => import('../views/admin/LoginView.vue') },
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('../views/admin/AdminDashboardView.vue'), meta: { requiresAuth: true } },
      { path: 'articles', name: 'admin-articles', component: () => import('../views/admin/AdminArticlesView.vue'), meta: { requiresAuth: true } },
      { path: 'articles/new', name: 'admin-article-new', component: () => import('../views/admin/AdminArticleEditView.vue'), meta: { requiresAuth: true } },
      { path: 'articles/:id/edit', name: 'admin-article-edit', component: () => import('../views/admin/AdminArticleEditView.vue'), meta: { requiresAuth: true }, props: true },
      { path: 'settings', name: 'admin-settings', component: () => import('../views/admin/AdminSettingsView.vue'), meta: { requiresAuth: true } },
    ],
  },

  /* ===== 404 ===== */
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 滚动行为: 回到顶部 / 锚点 / 首页分类&搜索直接定位内容区
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    // 首页带分类(cat)或搜索(q)参数: 导航后直接到内容区, 不停在封页
    if (to.path === '/' && (to.query.cat || to.query.q)) {
      return { top: window.innerHeight } // 内容区起点 = 一个视口高度
    }
    return { top: 0 }
  },
})

// 路由守卫: 后台 requiresAuth 前 checkAuth
router.beforeEach(async (to, _from) => {
  const adminLayout = to.matched.some((r) => r.meta?.type === 'admin')
  const requiresAuth = to.matched.some((r) => r.meta?.requiresAuth)

  if (adminLayout) {
    const auth = useAuthStore()
    // 访问后台任何路径, 先做一次 check-auth
    await auth.checkAuth()

    // 已登录访问 /admin/login → 跳仪表盘
    if (to.name === 'admin-login' && auth.authenticated) {
      return { name: 'admin-dashboard' }
    }

    // 未登录访问需鉴权页 → 跳登录
    if (requiresAuth && !auth.authenticated) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
  }
  return true
})

// 页面进入动效钩子
router.afterEach((to) => {
  document.title = buildTitle(to)
})

function buildTitle(to) {
  const map = {
    home: 'bianra 小屋',
    fortune: '每日抽签 · bianra 小屋',
    post: '文章 · bianra 小屋',
    'admin-dashboard': '仪表盘 · 后台',
    'admin-articles': '文章管理 · 后台',
    'admin-article-new': '新建文章 · 后台',
    'admin-article-edit': '编辑文章 · 后台',
    'admin-settings': '设置 · 后台',
    'admin-login': '登录 · 后台',
  }
  return map[to.name] || 'bianra 小屋'
}

export { router }
export default router
