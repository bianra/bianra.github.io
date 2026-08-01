<script setup>
// 404 页面 (公开站风格一致: 深色磨砂卡 + 背景图)
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="nf-root">
    <div class="nf-wrap">
      <div class="nf-card light-card">
        <div class="nf-num">404</div>
        <h2 class="nf-title">页面走丢了</h2>
        <p class="nf-sub">你访问的路径可能被删除，或者从未存在过</p>

        <div class="nf-actions">
          <RouterLink to="/" class="nf-btn primary">← 回到主页</RouterLink>
          <RouterLink to="/archive" class="nf-btn">📦 查看归档</RouterLink>
          <RouterLink to="/fortune" class="nf-btn">🍵 抽签转移心情</RouterLink>
        </div>

        <div class="nf-tip">💡 也许文章已经归档，点击上方「查看归档」找找看？</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nf-root {
  min-height: 100vh;
  width: 100%;
  padding: 96px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse 70% 50% at 20% 15%, #3a1e72 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 85% 85%, rgba(150, 50, 200, 0.45) 0%, transparent 60%),
    linear-gradient(160deg, #2a1454 0%, #12072b 45%, #0a0516 100%);
  background-attachment: fixed;
}
.nf-wrap {
  width: 100%;
  max-width: 520px;
}
.nf-card {
  padding: 56px 40px 44px;
  text-align: center;
}
.nf-num {
  font-size: clamp(72px, 16vw, 132px);
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(169,208,255,0.95) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 8px 32px rgba(0,0,0,0.35);
}
.nf-title {
  margin: 0 0 6px;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}
.nf-sub {
  margin: 0 0 28px;
  color: rgba(220, 212, 240, 0.76);
  font-size: 14px;
}

.nf-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}
.nf-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  color: rgba(238, 230, 255, 0.92);
  text-decoration: none;
  font-size: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  transition: all 0.18s;
}
.nf-btn:hover { background: rgba(255,255,255,0.14); color: #fff; transform: translateY(-1px); }
.nf-btn.primary {
  background: rgba(124, 108, 240, 0.85);
  border-color: rgba(124, 108, 240, 0.9);
  color: #fff;
}
.nf-btn.primary:hover { background: rgba(142, 126, 250, 1); }

.nf-tip {
  font-size: 12px;
  color: rgba(220, 212, 240, 0.52);
  letter-spacing: 0.02em;
}

@media (max-width: 560px) {
  .nf-root { padding: 64px 14px; }
  .nf-card { padding: 40px 24px; }
}
</style>
