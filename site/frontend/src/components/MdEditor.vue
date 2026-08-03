<script setup>
// 富文本编辑器 (TipTap v3): 所见即所得 + 图片拖拽调整大小 + 对齐
// 保存时导出 Markdown, 继续走现有 markdown-it 渲染管线
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Markdown } from 'tiptap-markdown'
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }, // Markdown 内容
  uploader: { type: Function, default: null }, // 图片上传函数 (file) => Promise<url>
})
const emit = defineEmits(['update:modelValue'])

const uploading = ref(false)
const imgInputRef = ref(null)

// TipTap 编辑器实例
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      codeBlock: { HTMLAttributes: { class: 'hljs code-box' } },
    }),
    Image.configure({
      // v3 原生: 拖拽调整大小
      resize: {
        enabled: true,
        directions: ['top', 'bottom', 'left', 'right'],
        minWidth: 80,
        minHeight: 40,
        alwaysPreserveAspectRatio: true,
      },
      inline: false,
      allowBase64: false,
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Markdown.configure({
      html: true, // 保留图片尺寸 HTML (拖拽调整的宽度), 渲染端有 DOMPurify 消毒
      breaks: true,
    }),
  ],
  onUpdate({ editor: e }) {
    // 内容变化 → 导出 Markdown 回传
    const md = e.storage.markdown.getMarkdown()
    emit('update:modelValue', md)
  },
})

// 图片上传 (复用现有 /admin/api/upload)
async function insertImage(file) {
  if (!file || !props.uploader) return
  uploading.value = true
  try {
    const { url } = await props.uploader(file)
    editor.value?.chain().focus().setImage({ src: url }).run()
  } catch (e) {
    alert(e.message || '图片上传失败')
  } finally {
    uploading.value = false
  }
}

function onPickImage(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (file) insertImage(file)
}

// 对齐命令
function setAlign(align) {
  editor.value?.chain().focus().setTextAlign(align).run()
}

// 排版命令
function exec(cmd, attrs) {
  editor.value?.chain().focus()[cmd](attrs || {}).run()
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="md-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive('bold') }" title="加粗" @click="exec('toggleBold')"><b>B</b></button>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive('italic') }" title="斜体" @click="exec('toggleItalic')"><i>I</i></button>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive('strike') }" title="删除线" @click="exec('toggleStrike')"><s>S</s></button>
      <span class="tb-sep"></span>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive('heading', { level: 1 }) }" title="大标题" @click="exec('toggleHeading', { level: 1 })">H1</button>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive('heading', { level: 2 }) }" title="中标题" @click="exec('toggleHeading', { level: 2 })">H2</button>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive('heading', { level: 3 }) }" title="小标题" @click="exec('toggleHeading', { level: 3 })">H3</button>
      <span class="tb-sep"></span>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive('bulletList') }" title="无序列表" @click="exec('toggleBulletList')">• 列表</button>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive('orderedList') }" title="有序列表" @click="exec('toggleOrderedList')">1. 列表</button>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive('blockquote') }" title="引用" @click="exec('toggleBlockquote')">❝ 引用</button>
      <button type="button" class="tb-btn" title="分割线" @click="exec('setHorizontalRule')">— 分割</button>
      <span class="tb-sep"></span>
      <!-- 对齐 -->
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive({ textAlign: 'left' }) }" title="左对齐" @click="setAlign('left')">左</button>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive({ textAlign: 'center' }) }" title="居中" @click="setAlign('center')">中</button>
      <button type="button" class="tb-btn" :class="{ on: editor?.isActive({ textAlign: 'right' }) }" title="右对齐" @click="setAlign('right')">右</button>
      <span class="tb-sep"></span>
      <!-- 图片 -->
      <button type="button" class="tb-btn" title="插入图片" :disabled="uploading" @click="imgInputRef?.click()">
        {{ uploading ? '上传中...' : '🖼 图片' }}
      </button>
      <input ref="imgInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none" @change="onPickImage" />
    </div>

    <!-- 编辑区 -->
    <div class="editor-area">
      <EditorContent :editor="editor" class="editor-content" />
    </div>

    <p class="editor-hint">💡 点击图片可拖拽四角调整大小;选中文字可用工具栏排版</p>
  </div>
</template>

<style scoped>
.md-editor {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--panel-solid);
}
.editor-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  background: rgba(var(--accent-rgb), 0.04);
}
.tb-btn {
  padding: 5px 9px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid transparent;
  color: var(--ink-2);
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.tb-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.1); color: var(--ink); }
.tb-btn.on { background: rgba(var(--accent-rgb), 0.18); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.3); }
.tb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tb-sep { width: 1px; height: 18px; background: var(--border); margin: 0 4px; }
.editor-area { min-height: 420px; }
.editor-content {
  padding: 20px 22px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--ink);
  min-height: 420px;
  outline: none;
}
.editor-hint { padding: 8px 12px; font-size: 11px; color: var(--ink-2); border-top: 1px solid var(--border); }

/* 编辑区内联内容样式 */
.editor-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}
.editor-content :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding-left: 14px;
  margin: 12px 0;
  color: var(--ink-2);
  font-style: italic;
}
.editor-content :deep(pre) {
  background: #16122b;
  border-radius: 10px;
  padding: 14px 16px;
  overflow-x: auto;
}
.editor-content :deep(code) {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
  color: #d7d0f0;
}
</style>
