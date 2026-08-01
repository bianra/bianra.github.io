<script setup>
/**
 * 确认弹窗 ConfirmDialog
 * 用法 (Promise):
 *   import { confirm } from '@/components/ConfirmDialog.vue'
 *   const ok = await confirm({ title: '删除?', message: '无法恢复', okText: '确认删除' })
 *   if (ok) { ... }
 */
import { createVNode, reactive, render } from 'vue'

const HOST_CLASS = '__bianra_dialog_host'

const s = reactive({ show: false, title: '确认', message: '', okText: '确定', cancelText: '取消', resolve: null })

function ensureHost() {
  let host = document.querySelector('.' + HOST_CLASS)
  if (!host) {
    host = document.createElement('div')
    host.className = HOST_CLASS
    document.body.appendChild(host)
    const styleEl = document.createElement('style')
    styleEl.textContent = `
.${HOST_CLASS} { position: fixed; inset: 0; z-index: 9998; }
.cd-mask { position: absolute; inset: 0; background: rgba(5, 3, 14, 0.55); backdrop-filter: blur(3px); animation: cd-m 0.18s ease-out both; }
.cd-wrap { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
.cd-box {
  width: min(420px, 100%);
  background: rgba(22, 17, 44, 0.96);
  color: #fff;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  padding: 24px;
  animation: cd-in 0.22s cubic-bezier(.22,1,.36,1) both;
}
.cd-title { font-size: 17px; font-weight: 700; margin: 0 0 8px; letter-spacing: 0.01em; }
.cd-msg   { color: rgba(220, 212, 240, 0.84); font-size: 14px; line-height: 1.65; margin: 0 0 22px; white-space: pre-line; }
.cd-actions { display: flex; justify-content: flex-end; gap: 10px; }
.cd-btn { padding: 9px 22px; border-radius: 10px; font-size: 14px; cursor: pointer; transition: all 0.18s; border: 1px solid; }
.cd-btn.cancel { background: rgba(255,255,255,0.06); color: rgba(220, 212, 240, 0.9); border-color: rgba(255,255,255,0.12); }
.cd-btn.cancel:hover { background: rgba(255,255,255,0.1); }
.cd-btn.ok { background: rgba(124, 108, 240, 0.9); color: #fff; border-color: rgba(124, 108, 240, 0.9); }
.cd-btn.ok:hover { background: rgba(142, 126, 250, 1); transform: translateY(-1px); }
.cd-btn.ok.danger { background: rgba(255, 107, 133, 0.92); border-color: rgba(255, 107, 133, 0.95); }
.cd-btn.ok.danger:hover { background: rgba(255, 127, 150, 1); }
@keyframes cd-in { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes cd-m  { from { opacity: 0; } to { opacity: 1; } }
`
    document.head.appendChild(styleEl)

    // 渲染视图
    const App = {
      setup() {
        function ok() {
          const r = s.resolve; s.resolve = null; s.show = false; r && r(true)
        }
        function cancel() {
          const r = s.resolve; s.resolve = null; s.show = false; r && r(false)
        }
        return () => {
          if (!s.show) return null
          return createVNode('div', { class: 'cd-wrap' }, [
            createVNode('div', { class: 'cd-mask', onClick: cancel }),
            createVNode('div', { class: 'cd-box', key: 'box' }, [
              s.title ? createVNode('div', { class: 'cd-title' }, s.title) : null,
              s.message ? createVNode('div', { class: 'cd-msg' }, s.message) : null,
              createVNode('div', { class: 'cd-actions' }, [
                createVNode('button', { class: 'cd-btn cancel', onClick: cancel }, s.cancelText),
                createVNode('button', {
                  class: ['cd-btn ok', s.okText && (s.okText.includes('删除') || s.okText.includes('危险') || s.okText.includes('注销')) ? 'danger' : ''],
                  onClick: ok
                }, s.okText)
              ])
            ])
          ])
        }
      }
    }
    render(createVNode(App), host)
  }
  return host
}

export function confirm({ title = '确认操作', message = '', okText = '确定', cancelText = '取消' } = {}) {
  ensureHost()
  return new Promise((resolve) => {
    s.title = title
    s.message = message
    s.okText = okText
    s.cancelText = cancelText
    s.resolve = resolve
    s.show = true
  })
}
</script>
