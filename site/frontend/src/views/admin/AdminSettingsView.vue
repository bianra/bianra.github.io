<script setup>
// 设置页: 资料(头像上传) + 社交链接动态增删(限5条) + 改密码
import { onMounted, ref } from 'vue'
import { adminApi } from '../../api/index.js'
import { useProfileStore, ART_FONTS } from '../../stores/profile.js'
import { toast } from '../../components/Toast.vue'

// 字体选项列表 (供选择器渲染)
const fontOptions = Object.entries(ART_FONTS).map(([key, v]) => ({ key, label: v.label, font: v.font }))

const profileStore = useProfileStore()

// 资料
const name = ref('')
const bio = ref('')
const announcement = ref('')
const avatarUrl = ref('')
const bgUrl = ref('')         // 全站背景图 (空 = 默认渐变)
const artFont = ref('lobster') // 封页艺术字字体
const social = ref([])
const savingProfile = ref(false)
const profileMsg = ref('')
const uploadingAvatar = ref(false)
const avatarInputRef = ref(null)
const bgInputRef = ref(null)

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
  bgUrl.value = s.bgUrl || ''
  artFont.value = s.artFont || 'lobster'
  social.value = Array.isArray(s.social) ? s.social.map(x => ({ label: x.label || '', url: x.url || '' })) : []
}

onMounted(load)

/* ===== 头像上传 ===== */
async function onPickAvatar(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  uploadingAvatar.value = true
  try { const { url } = await adminApi.upload(file); avatarUrl.value = url }
  catch (er) { toast.error(er.message || '头像上传失败') }
  finally { uploadingAvatar.value = false }
}

/* ===== 背景图上传 (全站背景, 复用 upload 接口) ===== */
async function onPickBg(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try { const { url } = await adminApi.upload(file); bgUrl.value = url }
  catch (er) { toast.error(er.message || '背景图上传失败') }
}

/* ===== 社交链接动态增删 (最多 5 条) ===== */
function addSocial() {
  if (social.value.length >= 5) { toast.warn('最多 5 条社交链接'); return }
  social.value.push({ label: '', url: '' })
}
function removeSocial(i) { social.value.splice(i, 1) }

async function saveProfile() {
  savingProfile.value = true
  profileMsg.value = ''
  try {
    // 过滤掉空行
    const cleanSocial = social.value.filter(s => s.label.trim() && s.url.trim())
      .map(s => ({ label: s.label.trim(), url: s.url.trim() }))
    await adminApi.updateSettings({
      name: name.value.trim(),
      bio: bio.value,
      announcement: announcement.value,
      avatarUrl: avatarUrl.value,
      bgUrl: bgUrl.value,
      artFont: artFont.value,
      social: cleanSocial,
    })
    social.value = cleanSocial
    // 刷新 profile store → 立即把新背景图应用到全站 (含当前后台页面)
    profileStore.fetchProfile(true)
    profileMsg.value = '✅ 资料已保存'
  } catch (e) { profileMsg.value = '❌ ' + (e.message || '保存失败') }
  finally { savingProfile.value = false }
}

async function changePassword() {
  savingPwd.value = true
  pwdErr.value = ''
  pwdMsg.value = ''
  if (newPassword.value.length < 6) {
    pwdErr.value = '新密码至少 6 位'; savingPwd.value = false; return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwdErr.value = '两次输入的新密码不一致'; savingPwd.value = false; return
  }
  try {
    await adminApi.changePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    pwdMsg.value = '✅ 密码已更新, 保持登录状态'
    oldPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''
  } catch (e) { pwdErr.value = e.message || '修改失败' }
  finally { savingPwd.value = false }
}
</script>

<template>
  <div>
    <h1 style="font-size:var(--fs-2xl);margin-bottom:24px;">设置</h1>

    <div style="display:grid;grid-template-columns:1fr;gap:24px;">
      <!-- 个人资料 -->
      <div class="glass-panel" style="padding:28px;display:flex;flex-direction:column;gap:16px;">
        <h2 style="font-size:var(--fs-xl);">个人资料</h2>

        <!-- 头像 -->
        <div>
          <label style="display:block;margin-bottom:8px;font-size:var(--fs-sm);color:var(--ink-2);">头像</label>
          <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
            <div v-if="avatarUrl" style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid var(--border);flex-shrink:0;">
              <img :src="avatarUrl" alt="头像" style="width:100%;height:100%;object-fit:cover;" />
            </div>
            <div v-else style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:32px;font-weight:700;flex-shrink:0;">
              {{ (name || 'B').charAt(0).toUpperCase() }}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <button class="btn-ghost" :disabled="uploadingAvatar" @click="avatarInputRef?.click()">
                {{ uploadingAvatar ? '上传中...' : '上传头像' }}
              </button>
              <button v-if="avatarUrl" class="btn-danger-text" @click="avatarUrl = ''">移除头像</button>
            </div>
            <input ref="avatarInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onPickAvatar" style="display:none;" />
          </div>
        </div>

        <!-- 背景图 (全站背景) -->
        <div>
          <label style="display:block;margin-bottom:8px;font-size:var(--fs-sm);color:var(--ink-2);">全站背景图</label>
          <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
            <div v-if="bgUrl" style="width:120px;height:68px;border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border);flex-shrink:0;background:#0a0516;">
              <img :src="bgUrl" alt="背景图" style="width:100%;height:100%;object-fit:cover;" />
            </div>
            <div v-else style="width:120px;height:68px;border-radius:var(--radius-sm);border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;color:rgba(220,212,240,0.7);font-size:11px;flex-shrink:0;background:linear-gradient(135deg,var(--hero-1),var(--hero-3));">
              默认渐变
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <button class="btn-ghost" @click="bgInputRef?.click()">上传背景图</button>
              <button v-if="bgUrl" class="btn-danger-text" @click="bgUrl = ''">恢复默认</button>
            </div>
            <input ref="bgInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onPickBg" style="display:none;" />
          </div>
          <p style="margin-top:6px;font-size:11px;color:var(--ink-2);">建议尺寸 ≥1920×1080。留空使用默认紫黑渐变, 保存后全站立即生效。</p>
        </div>

        <div>
          <label style="display:block;margin-bottom:8px;font-size:var(--fs-sm);color:var(--ink-2);">封页艺术字字体</label>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">
            <button
              v-for="fo in fontOptions"
              :key="fo.key"
              type="button"
              @click="artFont = fo.key"
              :style="{
                padding:'14px 16px',
                borderRadius:'var(--radius-sm)',
                border: artFont === fo.key ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: artFont === fo.key ? 'rgba(var(--accent-rgb),0.12)' : 'var(--panel-solid)',
                color:'var(--ink)',
                cursor:'pointer',
                textAlign:'center',
                transition:'all var(--transition)',
              }"
            >
              <span :style="{ fontFamily: fo.font, fontSize:'26px', display:'block', lineHeight:1.4, color:'#fff' }">bianra</span>
              <span style="font-size:11px;color:var(--ink-2);">{{ fo.label }}</span>
            </button>
          </div>
          <p style="margin-top:6px;font-size:11px;color:var(--ink-2);">点击预览选择封页 "bianra" 大字的字体风格, 保存后立即生效。</p>
        </div>

        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">名字</label>
          <input v-model="name" style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">公告</label>
          <input v-model="announcement" placeholder="一句话公告..." style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:var(--fs-sm);color:var(--ink-2);">简介 (主页侧栏显示)</label>
          <textarea v-model="bio" rows="5" placeholder="介绍自己..." style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);resize:vertical;outline:none;line-height:1.7;"></textarea>
        </div>

        <!-- 社交链接动态增删 -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <label style="font-size:var(--fs-sm);color:var(--ink-2);">社交链接 (最多 5 条)</label>
            <button v-if="social.length < 5" class="btn-ghost" style="padding:6px 12px;" @click="addSocial">+ 添加</button>
          </div>
          <div v-if="social.length === 0" style="color:var(--ink-2);font-size:var(--fs-sm);padding:12px;background:rgba(var(--accent-rgb),0.04);border-radius:var(--radius-sm);">
            暂无社交链接, 点击"+ 添加"
          </div>
          <div v-for="(s, i) in social" :key="i" style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
            <input v-model="s.label" placeholder="名称 (如 GitHub)" style="flex:0 0 140px;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;font-size:var(--fs-sm);" />
            <input v-model="s.url" placeholder="https://..." style="flex:1;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--panel-solid);color:var(--ink);outline:none;font-size:var(--fs-sm);" />
            <button class="btn-danger-text" style="padding:10px 12px;" @click="removeSocial(i)">删除</button>
          </div>
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

