<script setup>
// 知识 Agent: 左侧对话问答 + 右侧草稿审核台
import { ref, onMounted } from 'vue'

const messages = ref([])          // [{role:'user'|'agent', text}]
const question = ref('')
const asking = ref(false)

const drafts = ref([])            // 草稿列表
const selected = ref(null)        // 当前查看的草稿 {id,title,status,topic,content,...}
const loadingDrafts = ref(false)
const opinion = ref('')
const acting = ref(false)
const toast = ref('')

// 已入库笔记(合并/建树)
const notes = ref([])
const checked = ref(new Set())
const loadingNotes = ref(false)
const building = ref(false)

// 上传记录 → 生成笔记
const uploadText = ref('')
const uploadTopic = ref('')
const uploading = ref(false)

async function uploadAndGenerate() {
  const text = uploadText.value.trim()
  if (!text || uploading.value) return
  uploading.value = true
  try {
    const d = await api('/admin/api/agent/summarize', {
      method: 'POST',
      body: JSON.stringify({ text, topic: uploadTopic.value.trim() }),
    })
    messages.value.push({ role: 'user', text: '📤 上传了一段记录(共 ' + text.length + ' 字)' })
    messages.value.push({ role: 'agent', text: `✅ 已生成笔记草稿《${d.title || '未命名'}》(${d.draft_id})\n请在右侧审核台查看并审核。` })
    uploadText.value = ''
    uploadTopic.value = ''
    await loadDrafts()
    showToast('草稿已生成: ' + (d.draft_id || ''))
  } catch (e) {
    showToast('生成失败: ' + e.message)
  } finally {
    uploading.value = false
  }
}

async function api(path, opts = {}) {
  const r = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok && !data.ok) throw new Error(data.reason || data.error || `请求失败(${r.status})`)
  return data
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 3000)
}

// ===== 对话 =====
async function send() {
  const q = question.value.trim()
  if (!q || asking.value) return
  messages.value.push({ role: 'user', text: q })
  question.value = ''
  asking.value = true
  try {
    const d = await api(`/admin/api/agent/ask?query=${encodeURIComponent(q)}`)
    const src = (d.sources || []).length ? `\n\n📚 参考: ${d.sources.join(', ')}` : ''
    messages.value.push({ role: 'agent', text: (d.answer || '无回答') + src })
  } catch (e) {
    messages.value.push({ role: 'agent', text: '⚠️ ' + e.message })
  } finally {
    asking.value = false
  }
}

// ===== 审核台 =====
async function loadDrafts() {
  loadingDrafts.value = true
  try {
    const d = await api('/admin/api/agent/drafts')
    drafts.value = d.drafts || []
  } catch (e) {
    showToast('加载草稿失败: ' + e.message)
  } finally {
    loadingDrafts.value = false
  }
}

async function openDraft(d) {
  try {
    selected.value = await api(`/admin/api/agent/draft/${d.id}`)
  } catch (e) {
    showToast('读取草稿失败: ' + e.message)
  }
}

async function act(action) {
  if (!selected.value || acting.value) return
  acting.value = true
  try {
    const body = { draft_id: selected.value.id }
    if (action === 'feedback') body.opinion = opinion.value.trim()
    if (action === 'feedback' && !body.opinion) throw new Error('请先填写修改意见')
    // 审核动作同步进对话,过程可见
    const title = selected.value.title || selected.value.id
    if (action === 'feedback') {
      messages.value.push({ role: 'user', text: `✍️ 对《${title}》提意见: ${body.opinion}` })
    } else {
      messages.value.push({ role: 'user', text: `🎛 对《${title}》执行: ${actionLabel(action)}` })
    }
    const d = await api(`/admin/api/agent/${action}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    // Agent 在对话中的回应
    if (action === 'feedback') {
      messages.value.push({ role: 'agent', text: `✅ 已按你的意见修改《${title}》(状态: ${d.status || 'revised'})\n\n📝 修改说明:\n${d.revision_note || '草稿已更新'}\n\n(正文见右侧草稿预览,可继续提意见或点「通过」)` })
    } else if (action === 'approve') {
      messages.value.push({ role: 'agent', text: `✅ 《${title}》已审核通过(status: approved),可以「入库」了` })
    } else if (action === 'reject') {
      messages.value.push({ role: 'agent', text: `✖ 《${title}》已驳回(status: rejected),可修改意见后重新提交` })
    } else if (action === 'publish') {
      messages.value.push({ role: 'agent', text: `📦 《${title}》已入库!\n📁 笔记: ${d.note_path || 'knowledge/notes/<主题>/'}\n♻️ 已归档来源日志: ${(d.archived_logs || []).length} 条` })
    }
    showToast(`${actionLabel(action)}成功(${d.status || ''})`)
    opinion.value = ''
    await loadDrafts()
    if (action === 'publish') {
      selected.value = null
    } else {
      openDraft(selected.value)
    }
  } catch (e) {
    messages.value.push({ role: 'agent', text: '⚠️ ' + e.message })
    showToast(e.message)
  } finally {
    acting.value = false
  }
}

function actionLabel(a) {
  return { feedback: '提交意见', approve: '审核通过', reject: '驳回', publish: '入库' }[a] || a
}

// ===== 已入库笔记(合并/建树) =====
async function loadNotes() {
  loadingNotes.value = true
  try {
    const d = await api('/admin/api/agent/notes')
    notes.value = d.notes || []
  } catch (e) {
    showToast('加载笔记失败: ' + e.message)
  } finally {
    loadingNotes.value = false
  }
}
function toggleNote(id) {
  const s = new Set(checked.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  checked.value = s
}
async function build(kind) {
  if (building.value) return
  const ids = [...checked.value]
  if (kind === 'merge' && ids.length < 2) { showToast('合并至少勾选 2 篇笔记'); return }
  if (kind === 'tree' && ids.length < 1) { showToast('请至少勾选 1 篇笔记'); return }
  building.value = true
  try {
    const d = await api(`/admin/api/agent/${kind}`, { method: 'POST', body: JSON.stringify({ note_ids: ids }) })
    const label = kind === 'merge' ? '🤝 合并笔记' : '🌳 生成知识树'
    messages.value.push({ role: 'user', text: `${label}: 选了 ${ids.length} 篇笔记` })
    messages.value.push({ role: 'agent', text: `✅ ${kind === 'merge' ? '合并稿' : '知识树草稿'}已生成(${d.draft_id})
请在右侧审核台审核。` })
    checked.value = new Set()
    await loadDrafts()
    showToast('已生成草稿: ' + d.draft_id)
  } catch (e) {
    showToast('生成失败: ' + e.message)
  } finally {
    building.value = false
  }
}

onMounted(() => {
  loadDrafts()
  loadNotes()
})
</script>

<template>
  <div class="agent-page" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">
    <!-- ===== 顶部通栏: 上传记录 ===== -->
    <section class="glass-panel" style="grid-column:1 / -1;padding:20px;">
      <h3 style="margin:0 0 10px;font-size:var(--fs-lg);">📤 上传记录 → 生成笔记</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <textarea v-model="uploadText" rows="4" placeholder="粘贴一段工作记录/想法/问题解决过程,知识 Agent 会把它整理成结构化笔记草稿…"
                  style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;box-sizing:border-box;background:var(--surface);color:inherit;font-family:inherit;font-size:var(--fs-sm);line-height:1.5;resize:vertical;outline:none;"></textarea>
        <div style="display:flex;gap:8px;align-items:center;">
          <input v-model="uploadTopic" placeholder="主题(可选,默认自动识别)" 
                 style="flex:1;max-width:260px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:inherit;font-family:inherit;font-size:var(--fs-sm);outline:none;" />
          <button @click="uploadAndGenerate" :disabled="uploading || !uploadText.trim()" class="agent-btn"
                  style="padding:8px 18px;border-radius:8px;border:none;cursor:pointer;background:var(--accent);color:#fff;">🤖 {{ uploading ? '生成中…' : '生成笔记草稿' }}</button>
        </div>
      </div>
    </section>

    <!-- ===== 左: 对话 ===== -->
    <section class="glass-panel" style="padding:20px;display:flex;flex-direction:column;min-height:70vh;">
      <h3 style="margin:0 0 12px;font-size:var(--fs-lg);">💬 知识 Agent 对话</h3>
      <div class="chat-box" style="flex:1;overflow-y:auto;max-height:60vh;display:flex;flex-direction:column;gap:10px;margin-bottom:12px;">
        <div v-if="messages.length === 0" style="color:var(--ink-2);font-size:var(--fs-sm);text-align:center;padding:40px 0;">
          问它任何关于知识库的问题,如「审核流程怎么走」「云部署踩了什么坑」
        </div>
        <div v-for="(m, i) in messages" :key="i"
             :style="m.role === 'user'
               ? 'align-self:flex-end;background:var(--accent);color:#fff;padding:8px 14px;border-radius:14px 14px 2px 14px;max-width:85%;white-space:pre-wrap;'
               : 'align-self:flex-start;background:var(--surface);padding:8px 14px;border-radius:14px 14px 14px 2px;max-width:85%;white-space:pre-wrap;'">
          {{ m.text }}
        </div>
        <div v-if="asking" style="align-self:flex-start;color:var(--ink-2);">🤔 思考中…</div>
      </div>
      <div style="display:flex;gap:8px;">
        <input v-model="question" @keyup.enter="send" placeholder="输入问题,回车发送"
               style="flex:1;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--surface);" />
        <button @click="send" :disabled="asking" class="agent-btn"
                style="padding:10px 18px;border-radius:10px;background:var(--accent);color:#fff;border:none;cursor:pointer;">发送</button>
      </div>
    </section>

    <!-- ===== 右: 审核台 ===== -->
    <section class="glass-panel" style="padding:20px;">
      <h3 style="margin:0 0 12px;font-size:var(--fs-lg);">🗂 草稿审核台</h3>
      <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;">
        <button @click="loadDrafts" class="agent-btn" style="padding:6px 12px;border-radius:8px;border:1px solid var(--line);cursor:pointer;background:var(--surface);">刷新</button>
        <span style="color:var(--ink-2);font-size:var(--fs-sm);">共 {{ drafts.length }} 条</span>
      </div>

      <div v-if="loadingDrafts" style="color:var(--ink-2);padding:10px;">加载中…</div>
      <div v-else-if="drafts.length === 0" style="color:var(--ink-2);padding:10px;font-size:var(--fs-sm);">暂无草稿</div>

      <!-- 草稿列表 -->
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">
        <div v-for="d in drafts" :key="d.id" @click="openDraft(d)"
             :style="{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--line)',
                       background: selected && selected.id === d.id ? 'var(--accent)' : 'var(--surface)',
                       color: selected && selected.id === d.id ? '#fff' : 'inherit' }">
          <div style="font-weight:600;font-size:var(--fs-sm);">{{ d.title }}</div>
          <div style="font-size:var(--fs-xs);opacity:.8;">{{ d.topic }} · {{ d.status }} · {{ d.id }}</div>
        </div>
      </div>

      <!-- 草稿详情 + 操作 -->
      <div v-if="selected" style="border-top:1px solid var(--line);padding-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="font-size:var(--fs-sm);">{{ selected.title }}</strong>
          <span style="font-size:var(--fs-xs);color:var(--ink-2);">状态: {{ selected.status }}</span>
        </div>
        <pre style="white-space:pre-wrap;background:var(--surface);padding:12px;border-radius:10px;font-size:var(--fs-sm);max-height:40vh;overflow-y:auto;margin:0 0 12px;">{{ selected.content }}</pre>
        <textarea v-model="opinion" rows="3" placeholder="修改意见(提交意见时填写)"
                  style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:10px;box-sizing:border-box;background:var(--surface);color:inherit;font-family:inherit;font-size:var(--fs-sm);line-height:1.5;resize:vertical;min-height:70px;outline:none;"></textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button @click="act('feedback')" :disabled="acting" class="agent-btn" style="padding:8px 14px;border-radius:8px;border:1px solid var(--line);cursor:pointer;background:var(--surface);">✍️ {{ acting ? 'AI 修改中…' : '提交意见' }}</button>
          <button @click="act('approve')" :disabled="acting" class="agent-btn" style="padding:8px 14px;border-radius:8px;border:none;cursor:pointer;background:var(--accent);color:#fff;">✅ 通过</button>
          <button @click="act('reject')" :disabled="acting" class="agent-btn" style="padding:8px 14px;border-radius:8px;border:1px solid #e35;cursor:pointer;background:transparent;color:#e35;">✖ 驳回</button>
          <button @click="act('publish')" :disabled="acting" class="agent-btn" style="padding:8px 14px;border-radius:8px;border:none;cursor:pointer;background:var(--accent-2);color:#fff;">📦 入库</button>
        </div>
      </div>
    </section>

    <!-- ===== 右下方: 已入库笔记(合并/建树) ===== -->
    <section class="glass-panel" style="grid-column:2;padding:20px;">
      <h3 style="margin:0 0 12px;font-size:var(--fs-lg);">📚 已入库笔记</h3>
      <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button @click="loadNotes" class="agent-btn" style="padding:6px 12px;border-radius:8px;border:1px solid var(--line);cursor:pointer;background:var(--surface);">刷新</button>
        <button @click="build('merge')" :disabled="building" class="agent-btn" style="padding:6px 14px;border-radius:8px;border:none;cursor:pointer;background:var(--accent);color:#fff;">🤝 合并所选(≥2)</button>
        <button @click="build('tree')" :disabled="building" class="agent-btn" style="padding:6px 14px;border-radius:8px;border:1px solid var(--line);cursor:pointer;background:var(--surface);">🌳 生成知识树</button>
        <span style="color:var(--ink-2);font-size:var(--fs-sm);">已勾选 {{ checked.size }} / {{ notes.length }}</span>
      </div>
      <div v-if="loadingNotes" style="color:var(--ink-2);padding:10px;">加载中…</div>
      <div v-else-if="notes.length === 0" style="color:var(--ink-2);padding:10px;font-size:var(--fs-sm);">暂无已入库笔记(审核通过并入库后出现在这里)</div>
      <div style="display:flex;flex-direction:column;gap:4px;max-height:36vh;overflow-y:auto;">
        <label v-for="n in notes" :key="n.id"
               style="display:flex;gap:10px;align-items:center;padding:8px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer;">
          <input type="checkbox" :checked="checked.has(n.id)" @change="toggleNote(n.id)" style="flex-shrink:0;" />
          <div style="min-width:0;">
            <div style="font-weight:600;font-size:var(--fs-sm);">{{ n.title }}</div>
            <div style="font-size:var(--fs-xs);opacity:.8;">{{ n.topic }} · {{ n.id }}</div>
          </div>
        </label>
      </div>
    </section>

    <div v-if="toast" style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:10px;z-index:99;font-size:var(--fs-sm);">
      {{ toast }}
    </div>
  </div>
</template>

<style scoped>
.agent-btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
