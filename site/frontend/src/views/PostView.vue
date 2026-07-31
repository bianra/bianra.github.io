<script setup>
// 文章详情页 (阶段 5: markdown-it 渲染 + 封面大图)
import { onMounted, ref } from 'vue'
import { publicApi } from '../api/index.js'

const props = defineProps({ id: [String, Number] })
const article = ref(null)
const loading = ref(true)
const err = ref(null)

onMounted(async () => {
  try {
    article.value = await publicApi.getArticle(props.id)
  } catch (e) {
    err.value = e
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container" style="padding:48px var(--space-md);max-width:var(--content-max);">
    <div v-if="loading" style="color:var(--ink-2);">加载中...</div>
    <div v-else-if="err" class="empty-state">
      <h2>文章不存在 (404)</h2>
      <router-link to="/" class="btn-ghost">回主页</router-link>
    </div>
    <article v-else class="glass-panel" style="padding:32px;">
      <h1 style="font-size:var(--fs-2xl);margin-bottom:12px;">{{ article.title }}</h1>
      <p style="color:var(--ink-2);margin-bottom:24px;">
        {{ new Date(article.createdAt).toLocaleString('zh-CN') }}
      </p>
      <div style="white-space:pre-wrap;line-height:1.9;">
        <!-- 阶段 5: 用 markdown-it 渲染, 这里先转义后显示 -->
        {{ article.content }}
      </div>
    </article>
  </div>
</template>
