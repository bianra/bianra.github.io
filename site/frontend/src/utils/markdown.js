/**
 * markdown-it 统一配置 + 小框(callout)渲染 + 代码高亮
 * PostView 与后台编辑器预览共用
 */
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'
import container from 'markdown-it-container'
import DOMPurify from 'dompurify'

// 创建 markdown-it 实例
// html:true 以支持富文本编辑器导出的图片尺寸 HTML, 渲染后必须过 sanitizeHtml 消毒防 XSS
export function createMd() {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    highlight(str, lang) {
      // 超大代码块 (≥50KB) 跳过语法高亮, 避免阻塞主线程卡死
      if (str.length > 50000) {
        return `<pre class="hljs code-box"><code>${md.utils.escapeHtml(str)}</code></pre>`
      }
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs code-box"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
        } catch (_) { /* fallthrough */ }
      }
      // 无语言/未知语言: 转义后仍加 code-box 样式
      return `<pre class="hljs code-box"><code>${md.utils.escapeHtml(str)}</code></pre>`
    },
  })

  // ===== 小框容器 (:::tip / :::note / :::warning / :::danger / :::quote / :::details) =====
  const boxTypes = {
    tip:    { cls: 'callout-tip',    icon: '💡', label: '提示' },
    note:   { cls: 'callout-note',   icon: '📝', label: '备注' },
    warning:{ cls: 'callout-warning', icon: '⚠️', label: '警告' },
    danger: { cls: 'callout-danger', icon: '🚫', label: '危险' },
    quote:  { cls: 'callout-quote',  icon: '💬', label: '引用' },
    details:{ cls: 'callout-details', icon: '📂', label: '详情' },
  }

  for (const [name, cfg] of Object.entries(boxTypes)) {
    md.use(container, name, {
      validate: (params) => params.trim().match(new RegExp(`^${name}\\s*(.*)$`)),
      render(tokens, idx) {
        const token = tokens[idx]
        if (token.nesting === 1) {
          // 开标签: 提取标题 (:::tip 标题 或 无标题用默认 label)
          const match = token.info.trim().match(/^\S+\s*(.*)$/)
          const title = (match && match[1]) || cfg.label
          const collapsible = name === 'details'
          return `<div class="callout ${cfg.cls}">
            <div class="callout-head"><span class="callout-icon">${cfg.icon}</span><span class="callout-title">${md.utils.escapeHtml(title)}</span>${collapsible ? '<span class="callout-toggle">▾</span>' : ''}</div>
            <div class="callout-body">`
        }
        // 闭标签
        return `</div></div>`
      },
    })
  }

  return md
}

/**
 * 渲染后处理: 给代码块加复制按钮 + 处理折叠框
 * 在组件 mounted/updated 后调用
 */
export function enhanceRendered(el) {
  if (!el) return
  // 代码块复制按钮
  el.querySelectorAll('pre.code-box').forEach((pre) => {
    if (pre.querySelector('.code-copy')) return // 已加过
    const btn = document.createElement('button')
    btn.className = 'code-copy'
    btn.textContent = '复制'
    btn.setAttribute('aria-label', '复制代码')
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.innerText || ''
      try {
        await navigator.clipboard.writeText(code)
        btn.textContent = '✓ 已复制'
      } catch (_) {
        btn.textContent = '复制失败'
      }
      setTimeout(() => { btn.textContent = '复制' }, 1500)
    })
    pre.appendChild(btn)
  })
  // 折叠框展开/收起
  el.querySelectorAll('.callout-details').forEach((box) => {
    if (box.querySelector('.callout-head')?.hasClickListener) return
    const head = box.querySelector('.callout-head')
    if (!head) return
    head.hasClickListener = true
    head.style.cursor = 'pointer'
    head.addEventListener('click', () => {
      box.classList.toggle('collapsed')
      const toggle = head.querySelector('.callout-toggle')
      if (toggle) toggle.textContent = box.classList.contains('collapsed') ? '▸' : '▾'
    })
    // 默认收起
    box.classList.add('collapsed')
  })
}

/**
 * 渲染结果消毒 (XSS 防护)
 * markdown-it html:true 允许了 HTML, 渲染前必须过 DOMPurify
 * 白名单: 基本排版标签 + 图片(含 style 尺寸), 剥离 script/iframe/事件属性
 */
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 's', 'u', 'del', 'code', 'pre', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img',
      'hr', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'align'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|data:image\/[a-z+]+);?|#|\/)/i,
  })
}

/** 渲染 Markdown → 消毒后 HTML (统一入口) */
export function renderMd(markdown) {
  return sanitizeHtml(createMd().render(markdown || ''))
}
