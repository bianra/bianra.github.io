<script>
/**
 * 全局轻提示 Toast
 * 用法:
 *   import { toast } from '@/components/Toast.vue'
 *   toast.success('保存成功')
 *   toast.error('失败啦')
 *   toast.info('提示', { duration: 2000 })
 */
import { reactive, createVNode, render } from 'vue'

const state = reactive({
  show: false,
  type: 'info',   // 'info' | 'success' | 'error' | 'warn'
  text: '',
  timer: 0,
})

const HOST_CLASS = '__bianra_toast_host'

function ensureHost() {
  let host = document.querySelector('.' + HOST_CLASS)
  if (!host) {
    host = document.createElement('div')
    host.className = HOST_CLASS
    document.body.appendChild(host)
    // 全局样式
    const s = document.createElement('style')
    s.textContent = `
.${HOST_CLASS} { position: fixed; top: 20%; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none; z-index: 10000; }
.bt-root { pointer-events: auto; display: inline-flex; align-items: center; gap: 10px; padding: 10px 22px; border-radius: 999px; font-size: 14px; color: #fff;
  background: rgba(18, 14, 38, 0.92); border: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 10px 32px rgba(0,0,0,0.45); backdrop-filter: blur(10px);
  animation: bt-in 0.22s ease-out both; transform-origin: top center; }
.bt-root.bt-leave { animation: bt-out 0.22s ease-in both; }
.bt-icon { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; }
.bt-type-info    { color: #a9d0ff; }
.bt-type-success { color: #c2f1d1; }
.bt-type-warn    { color: #ffd588; }
.bt-type-error   { color: #ffb0b8; }
@keyframes bt-in { from { opacity: 0; transform: translateY(-12px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes bt-out { to { opacity: 0; transform: translateY(-8px) scale(0.98); } }
`
    document.head.appendChild(s)
    // 首次挂载一个响应式 Toast 视图
    const vnode = createVNode({
      setup() {
        return () => state.show ? createVNode('div', {
          class: ['bt-root', state.show ? '' : 'bt-leave']
        }, [
          createVNode('span', { class: ['bt-icon', `bt-type-${state.type}`] }, [
            state.type === 'success' ? '✓' :
            state.type === 'error'   ? '✕' :
            state.type === 'warn'    ? '!' : 'ⓘ'
          ]),
          createVNode('span', { style: { letterSpacing: '0.02em' } }, state.text)
        ]) : null
      }
    })
    render(vnode, host)
  }
  return host
}

function show(text, { type = 'info', duration = 2000 } = {}) {
  ensureHost()
  state.text = String(text)
  state.type = type
  state.show = true
  clearTimeout(state.timer)
  state.timer = setTimeout(() => {
    state.show = false
  }, duration)
}

export const toast = {
  info:    (t, o) => show(t, { ...o, type: 'info' }),
  success: (t, o) => show(t, { ...o, type: 'success' }),
  warn:    (t, o) => show(t, { ...o, type: 'warn' }),
  error:   (t, o) => show(t, { ...o, type: 'error' }),
}
</script>

<script setup>
// 无模板组件: 纯 JS 服务 (toast 导出在普通 <script> 中)
</script>
