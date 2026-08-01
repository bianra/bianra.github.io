<script setup>
// 公开站底部 Footer: 版权 + RSS + 回到顶部
import { RouterLink } from 'vue-router'
const year = new Date().getFullYear()
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <footer class="site-foot">
    <div class="foot-inner light-card">
      <div class="foot-left">
        <div class="foot-brand">
          <span class="brand-logo" aria-hidden="true">🌿</span>
          <span>bianra 小屋</span>
        </div>
        <p class="foot-copy">© {{ year }} bianra.com · All rights reserved</p>
      </div>

      <div class="foot-links">
        <RouterLink to="/" class="foot-link">首页</RouterLink>
        <RouterLink to="/fortune" class="foot-link">抽签</RouterLink>
        <a href="/api/feed.xml" class="foot-link" target="_blank" rel="noopener nofollow">RSS</a>
      </div>

      <div class="foot-right">
        <button class="to-top" @click="scrollToTop" title="回到顶部">↑</button>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-foot {
  width: 100%;
  padding: 32px 24px 48px;
}
.foot-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.foot-left { min-width: 200px; }
.foot-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: 4px;
}
.brand-logo { font-size: 18px; }
.foot-copy {
  margin: 0;
  font-size: 12px;
  color: rgba(220, 212, 240, 0.56);
  letter-spacing: 0.02em;
}

.foot-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  align-items: center;
}
.foot-link {
  color: rgba(220, 212, 240, 0.78);
  text-decoration: none;
  font-size: 13px;
  transition: color var(--transition), transform var(--transition);
}
.foot-link:hover { color: #fff; transform: translateY(-1px); }

.foot-right { display: flex; align-items: center; }
.to-top {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.14);
  font-size: 15px;
  cursor: pointer;
  transition: all var(--transition);
}
.to-top:hover {
  transform: translateY(-2px);
  background: rgba(255,255,255,0.14);
}

@media (max-width: 760px) {
  .site-foot { padding: 20px 14px 40px; }
  .foot-inner { padding: 20px; gap: 16px; }
  .foot-links { width: 100%; justify-content: flex-start; order: 3; }
}
</style>
