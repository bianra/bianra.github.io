<script setup>
// 404 页面
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="container empty-state" style="min-height:100vh;">
    <div style="font-size:clamp(80px, 14vw, 160px);background:linear-gradient(135deg,var(--accent),var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1;font-weight:700;">404</div>
    <h2 style="font-size:var(--fs-xl);color:var(--ink);">页面走丢了</h2>
    <p style="color:var(--ink-2);">你访问的路径不存在</p>
    <div style="display:flex;gap:12px;margin-top:24px;">
      <RouterLink to="/" class="btn-primary">回到主页</RouterLink>
      <RouterLink to="/archive" class="btn-ghost">查看归档</RouterLink>
    </div>
  </div>
</template>
