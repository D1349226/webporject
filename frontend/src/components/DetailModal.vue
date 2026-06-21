<template>
  <Teleport to="body">
    <div v-if="item" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-sheet">
        <button class="sheet-close" @click="$emit('close')">✕</button>

        <div class="sheet-photo" v-if="item.image" @click="$emit('lightbox', item.image)">
          <img :src="`${uploadsBase}/${item.image}`" />
          <span class="sheet-zoom-hint">點擊放大</span>
        </div>
        <div class="sheet-photo sheet-photo-empty" v-else>{{ emoji }}</div>

        <div class="sheet-body">
          <div class="sheet-tags">
            <span class="tag type-tag" :class="item.type">{{ item.type === 'lost' ? '遺失' : '拾獲' }}</span>
            <span class="tag status-tag" :class="item.status">{{ label }}</span>
          </div>
          <h2 class="sheet-title">{{ item.title }}</h2>
          <dl class="sheet-dl">
            <div><dt>分類</dt><dd>{{ item.category }}</dd></div>
            <div><dt>時間</dt><dd>{{ item.date || '—' }}</dd></div>
            <div><dt>地點</dt><dd>{{ item.location || '—' }}</dd></div>
            <div><dt>發布者</dt><dd>{{ item.owner_name || '匿名' }}</dd></div>
            <div v-if="item.description"><dt>描述</dt><dd>{{ item.description }}</dd></div>
          </dl>

          <div v-if="item.status === 'active'" class="claim-section">
            <h3 class="claim-heading">申請認領 / 聯絡告知</h3>
            <form class="editorial-form" @submit.prevent="submitClaim">
              <div class="form-row">
                <label>您的稱呼</label>
                <input type="text" v-model="claimForm.claimer_name" placeholder="例如：王同學" required />
              </div>
              <div class="form-row">
                <label>聯絡方式</label>
                <input type="text" v-model="claimForm.contact_info" placeholder="電話 / Email" required />
              </div>
              <div class="form-row form-row-col">
                <label>認領說明</label>
                <textarea v-model="claimForm.claim_reason" rows="3" placeholder="說明認領依據或約定面交方式⋯"></textarea>
              </div>
              <div class="form-submit">
                <button type="submit" class="submit-btn">提交認領</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { API_BASE, authHeaders, statusLabel, defaultEmoji } from '../utils/api.js'

export default {
  props: {
    item:        { type: Object, default: null },
    uploadsBase: { type: String, default: '/uploads' },
  },
  emits: ['close', 'claimed', 'lightbox', 'toast'],
  data() {
    return { claimForm: { claimer_name: '', contact_info: '', claim_reason: '' } }
  },
  computed: {
    label() { return statusLabel(this.item?.status) },
    emoji() { return defaultEmoji(this.item?.category) },
  },
  methods: {
    async submitClaim() {
      try {
        const r = await fetch(`${API_BASE}/claims`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ ...this.claimForm, item_id: this.item.id }),
        })
        if (r.ok) {
          this.$emit('toast', '認領成功！')
          this.$emit('claimed')
          this.claimForm = { claimer_name: '', contact_info: '', claim_reason: '' }
        } else {
          this.$emit('toast', '提交失敗', 'error')
        }
      } catch { this.$emit('toast', '提交失敗', 'error') }
    },
  },
}
</script>
