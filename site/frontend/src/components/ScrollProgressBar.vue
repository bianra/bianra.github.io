<script setup>
/**
 * 顶部三色滚动进度条 (轻量 1 行代码挂载)
 * 用法: <ScrollProgressBar /> 放到 App.vue 根即可
 */
import { onMounted, onBeforeUnmount, ref } from 'vue'

const percent = ref(0)
function update() {
  const docH = document.documentElement.scrollHeight - window.innerHeight
  if (docH <= 0) { percent.value = 0; return }
  const y = window.scrollY || window.pageYOffset
  percent.value = Math.max(0, Math.min(100, (y / docH) * 100))
}
let rafId = 0
function onScroll() {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(update)
}
onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div class="spb-root" aria-hidden="true">
    <div
      class="spb-fill"
      :style="{ width: percent + '%' }"
    ></div>
  </div>
</template>

<style scoped>
.spb-root {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: transparent;
  z-index: 9999;
  pointer-events: none;
}
.spb-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    #7c6cf0 0%,
    #4aa8ff 50%,
    #34d399 100%
  );
  box-shadow: 0 0 10px rgba(124, 108, 240, 0.55);
  transition: width 0.12s ease-out;
  will-change: width;
}
</style>
