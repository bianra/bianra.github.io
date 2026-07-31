<script setup>
// 设置页: 资料 + 改密码 (阶段 6: 头像上传 + 社交链接动态增删)
import { onMounted, ref } from 'vue'
import { adminApi } from '../../api/index.js'

// 资料
const name = ref('')
const bio = ref('')
const announcement = ref('')
const avatarUrl = ref('')
const social = ref([])
const savingProfile = ref(false)
const profileMsg = ref('')

// 改密码
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPwd = ref(false)
const pwdMsg = ref('')
const pwdErr = ref('')

async function load() {
  const s = await adminApi.getSettings()
  name.value = s.name || ''
  bio.value = s.bio || ''
  announcement.value = s.announcement || ''
  avatarUrl.value = s.avatarUrl || ''
  social.value = Array.isArray(s.social) ? s.social : []
}

onMounted(load)

async function saveProfile() {
  savingProfile.value = true
  profileMsg.value = ''
  try {
    await adminApi.updateSettings({
      name: name.value.trim(),
      bio: bio.value,
      announcement: announcement.value,
      avatarUrl: avatarUrl.value,
      social: social.value,
    })
    profileMsg.value = '✅ 资料已保存'
  } catch (e) {
    profileMsg.value = '❌ ' + (e.message || '保存失败')
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  savingPwd.value = true
  pwdErr.value = ''
  pwdMsg.value = ''
  if (newPassword.value !== confirmPassword.value) {
    pwdErr.value = '两次输入的新密码不一致'
    savingPwd.value = false
    return
  }
  try {
    await adminApi.changePassword({
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
    })
    pwdMsg.value = '✅ 密码已更新, 保持登录状态'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    pwdErr.value = e.message || '修改失败'
  } finally {
    savingPwd.value = false
  }
}
</script>

<template>
  <div>
    <h1 style="font-size:var(--fs-2xl);margin-bottom:24px;">设置</h1>

    <div style="display:grid;grid-template-columns:1fr;gap:24px;">
      <!-- 个人资料 -->
      <div class="glass-panel" style="padding:28px;display:flex;flex-direction:column;gap:16px;">
        <h2 style="font-size:var(--fs-xl);">个人资料</h2>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">名字</label>
          <input v-model="name" style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">公告</label>
          <input v-model="announcement" style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">头像 URL</label>
          <input v-model="avatarUrl" placeholder="(阶段 6: 上传按钮)" style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">
            关于页长文 (bio)
          </label>
          <textarea
            v-model="bio" rows="5"
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);resize:vertical;outline:none;"
          ></textarea>
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">
            社交链接 (阶段 6: 动态增删, 限 5 条) — 只读展示:
          </label>
          <pre style="padding:12px;border-radius:var(--radius-sm);background:rgba(var(--accent-rgb),0.06);font-size:var(--fs-sm);color:var(--ink-2);white-space:pre-wrap;">{{ JSON.stringify(social, null, 2) }}</pre>
        </div>
        <div>
          <button class="btn-primary" :disabled="savingProfile" @click="saveProfile" style="min-width:140px;">
            {{ savingProfile ? '保存中...' : '保存资料' }}
          </button>
          <span v-if="profileMsg" style="margin-left:12px;font-size:var(--fs-sm);color:var(--ink-2);">{{ profileMsg }}</span>
        </div>
      </div>

      <!-- 改密码 -->
      <div class="glass-panel" style="padding:28px;display:flex;flex-direction:column;gap:16px;">
        <h2 style="font-size:var(--fs-xl);">修改密码</h2>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">旧密码</label>
          <input v-model="oldPassword" type="password" style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">新密码 (≥6 位)</label>
          <input v-model="newPassword" type="password" style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">确认新密码</label>
          <input v-model="confirmPassword" type="password" @keyup.enter="changePassword" style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;" />
        </div>
        <div v-if="pwdErr" style="padding:10px 12px;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:var(--radius-sm);font-size:var(--fs-sm);">{{ pwdErr }}</div>
        <div>
          <button class="btn-primary" :disabled="savingPwd" @click="changePassword" style="min-width:140px;">
            {{ savingPwd ? '更新中...' : '更新密码' }}
          </button>
          <span v-if="pwdMsg" style="margin-left:12px;font-size:var(--fs-sm);color:var(--ink-2);">{{ pwdMsg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
