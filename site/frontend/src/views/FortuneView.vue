<script setup>
// 每日抽卡 (阶段 5: fnv1a + mulberry32 纯函数 + 动画)
</script>

<template>
  <div class="container" style="padding:80px var(--space-md);display:flex;flex-direction:column;align-items:center;">
    <h1 style="font-size:var(--fs-2xl);margin-bottom:16px;">每日抽卡</h1>
    <p style="color:var(--ink-2);margin-bottom:32px;">今日的小运势 (阶段 5: 摇一摇动画 + 结果只在浏览器本地生成, 不联网)</p>
    <div class="glass-panel" style="padding:48px 64px;min-width:360px;display:flex;flex-direction:column;align-items:center;gap:20px;">
      <div style="font-size:72px;">🍵</div>
      <p style="color:var(--ink-2);">点下方按钮开始抽取</p>
      <button class="btn-primary">摇一摇</button>
    </div>
  </div>
</template>
