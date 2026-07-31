<script setup>
// 后台登录页
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const loading = ref(false)
const err = ref('')

onMounted(() => {
  if (auth.authenticated) router.push({ name: 'admin-dashboard' })
})

async function submit() {
  loading.value = true
  err.value = ''
  try {
    const res = await auth.login(username.value.trim(), password.value)
    if (res?.ok) {
      const redirect = route.query.redirect || '/admin/dashboard'
      router.push(redirect)
    } else {
      err.value = '用户名或密码错误'
    }
  } catch (e) {
    err.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:24px;">
    <div class="glass-panel" style="width:100%;max-width:400px;padding:40px 32px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:36px;font-weight:700;background:linear-gradient(135deg,var(--accent),var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent;">bianra</div>
        <div style="color:var(--ink-2);margin-top:8px;font-size:var(--fs-sm);">登录后台</div>
      </div>

      <form @submit.prevent="submit" style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">用户名</label>
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="admin"
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;transition:border-color var(--transition);"
          />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">密码</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;transition:border-color var(--transition);"
          />
        </div>
        <div v-if="err" style="color:#e74c3c;font-size:var(--fs-sm);padding:10px 12px;background:rgba(231,76,60,0.1);border-radius:var(--radius-sm);">
          {{ err }}
        </div>
        <button
          type="submit"
          class="btn-primary"
          style="width:100%;margin-top:8px;"
          :disabled="loading"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>
