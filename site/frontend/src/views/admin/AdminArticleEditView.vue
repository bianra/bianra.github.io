<script setup>
// 新建/编辑文章 (阶段 6: 双栏编辑器 + 上传 + 草稿)
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../../api/index.js'

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id

const title = ref('')
const summary = ref('')
const content = ref('')
const coverUrl = ref('')
const saving = ref(false)
const err = ref('')

onMounted(async () => {
  if (isEdit) {
    // 阶段 6: 调用 adminApi.getArticle, 先用空壳
  }
})

async function save() {
  saving.value = true
  err.value = ''
  try {
    const body = {
      title: title.value.trim(),
      summary: summary.value,
      content: content.value,
      coverUrl: coverUrl.value,
    }
    if (isEdit) {
      await adminApi.updateArticle(route.params.id, body)
    } else {
      const r = await adminApi.createArticle(body)
      router.replace({ name: 'admin-article-edit', params: { id: r.id } })
    }
  } catch (e) {
    err.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <h1 style="font-size:var(--fs-2xl);">{{ isEdit ? '编辑文章' : '新建文章' }}</h1>
      <div style="display:flex;gap:8px;">
        <router-link :to="{ name: 'admin-articles' }" class="btn-ghost">取消</router-link>
        <button class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div v-if="err" style="margin-bottom:16px;padding:12px;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:var(--radius-sm);font-size:var(--fs-sm);">
      {{ err }}
    </div>

    <div style="display:grid;grid-template-columns:1fr;gap:16px;">
      <div class="glass-panel" style="padding:24px;display:flex;flex-direction:column;gap:16px;">
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">标题 (≤100 字)</label>
          <input
            v-model="title"
            type="text"
            maxlength="100"
            placeholder="文章标题..."
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);font-size:var(--fs-lg);font-weight:600;outline:none;"
          />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">摘要 (≤200 字)</label>
          <input
            v-model="summary"
            type="text"
            maxlength="200"
            placeholder="这篇文章讲了啥..."
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;"
          />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">封面图 URL</label>
          <input
            v-model="coverUrl"
            type="text"
            placeholder="(阶段 6: 上传按钮 + 图片预览)"
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;"
          />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">正文 (Markdown)</label>
          <textarea
            v-model="content"
            rows="14"
            placeholder="# 开始写作...  (阶段 6: 双栏编辑器 + 工具栏 + 实时预览 + 插入图片 + 自动草稿)"
            style="width:100%;padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);font-family:ui-monospace, Consolas, monospace;font-size:var(--fs-sm);resize:vertical;line-height:1.7;outline:none;"
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>
