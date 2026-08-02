<script setup>
// 个人信息卡: 头像 + 名字 + 公告 + 简介 + 分类文章数
// 纯只读展示: 所有资料编辑统一在后台管理界面 (/admin/settings) 完成
import { computed, onMounted, ref } from 'vue'
import { useProfileStore } from '../stores/profile.js'
import { publicApi } from '../api/index.js'

const store = useProfileStore()
const profile = computed(() => store.profile || {})

// 分类文章数 (日记/学习/代码, 实时)
const catCounts = ref({ diary: 0, study: 0, code: 0, chat: 0 })
const CATS = [
  { key: 'diary', label: '日记', to: '/?cat=diary' },
  { key: 'study', label: '学习', to: '/?cat=study' },
  { key: 'code', label: '代码', to: '/?cat=code' },
  { key: 'chat', label: '闲谈', to: '/?cat=chat' },
]

onMounted(async () => {
  try {
    const data = await publicApi.getCategoryCounts()
    catCounts.value = { diary: 0, study: 0, code: 0, chat: 0, ...(data || {}) }
  } catch (_) { /* 后端未启动则保持 0 */ }
})

// 只读展示 (无数据时给占位)
const name = computed(() => profile.value.name || 'bianra')
const bio = computed(() =>
  profile.value.bio || '这是一段关于我的介绍。在这里你可以记录心情，留下印记，欢迎大家留言互动！'
)
const announcement = computed(() => profile.value.announcement || '')
const avatarUrl = computed(() => profile.value.avatarUrl || null)
</script>

<template>
  <aside class="profile-card light-card" aria-label="个人信息">
    <!-- 头像 -->
    <div class="avatar-ring">
      <img v-if="avatarUrl" :src="avatarUrl" :alt="name" />
      <div v-else class="avatar-fallback" aria-hidden="true">🙂</div>
    </div>

    <!-- 名字 -->
    <h3 class="profile-name">{{ name }}</h3>

    <!-- 公告 (有内容才显) -->
    <p v-if="announcement" class="profile-announcement">{{ announcement }}</p>

    <!-- 简介 -->
    <p class="profile-bio">{{ bio }}</p>

    <!-- 分割线 -->
    <div class="divider" role="presentation"></div>

    <!-- 分类文章数 (日记/学习/代码) -->
    <div class="profile-stats">
      <RouterLink v-for="c in CATS" :key="c.key" :to="c.to" class="stat cat-stat">
        <div class="stat-num">{{ catCounts[c.key] || 0 }}</div>
        <div class="stat-label">{{ c.label }}</div>
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.profile-card {
  text-align: center;
  position: relative;
}

/* 只读 */
.profile-name {
  margin-top: 16px;
  font-size: var(--fs-xl);
  color: #fff;
  letter-spacing: 0.02em;
}
.profile-announcement {
  margin-top: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: rgba(220, 212, 240, 0.9);
  background: rgba(124, 108, 240, 0.16);
  border-radius: 999px;
  display: inline-block;
}
.profile-bio {
  margin-top: 10px;
  color: rgba(238, 230, 255, 0.78);
  font-size: var(--fs-sm);
  line-height: 1.75;
}
.divider {
  margin: 20px auto 18px;
  width: 40%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
}
.profile-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
}
.stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-num { font-size: 22px; line-height: 1; color: #fff; }
.stat-label { color: rgba(238, 230, 255, 0.62); font-size: var(--fs-xs); letter-spacing: 0.04em; }

/* 分类统计链接 */
.cat-stat {
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 10px;
  transition: background var(--transition), transform var(--transition);
}
.cat-stat:hover {
  background: rgba(var(--accent-rgb), 0.12);
  transform: translateY(-2px);
}
.cat-stat:hover .stat-label { color: #fff; }

/* 头像环 (只读) */
.avatar-ring {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  margin: 0 auto;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.24);
  box-shadow: 0 0 0 4px rgba(124, 108, 240, 0.16);
}
.avatar-ring img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}
</style>
