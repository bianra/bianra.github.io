<script setup>
// 关于页 (阶段 5: 展示 profile.bio 长文)
import { onMounted, ref } from 'vue'
import { useProfileStore } from '../stores/profile.js'

const profileStore = useProfileStore()
const loading = ref(true)

onMounted(async () => {
  await profileStore.fetchProfile()
  loading.value = false
})
</script>

<template>
  <div class="container" style="padding:80px var(--space-md);max-width:var(--content-max);">
    <h1 style="font-size:var(--fs-2xl);margin-bottom:32px;">关于</h1>
    <div v-if="loading" style="color:var(--ink-2);">加载中...</div>
    <article v-else class="glass-panel" style="padding:32px;">
      <h2 style="font-size:var(--fs-xl);margin-bottom:16px;">
        {{ profileStore.profile?.name || 'bianra' }}
      </h2>
      <p v-if="profileStore.profile?.bio" style="white-space:pre-wrap;line-height:1.9;">
        {{ profileStore.profile.bio }}
      </p>
      <p v-else style="color:var(--ink-2);">
        (阶段 5: 这里展示自我介绍长文, 可在后台 Settings 中编辑)
      </p>
    </article>
  </div>
</template>
