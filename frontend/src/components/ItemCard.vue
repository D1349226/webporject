<template>
  <article class="item-card" :class="item.status" @click="$emit('view', item.id)">
    <div class="card-photo"
      @click.stop="item.image && $emit('lightbox', item.image)"
      :class="{ 'photo-zoom': item.image }"
    >
      <img v-if="item.image" :src="`${uploadsBase}/${item.image}`" :alt="item.title" />
      <div v-else class="card-photo-empty">{{ emoji }}</div>
      <div class="card-status-bar" :class="item.status"></div>
    </div>

    <div class="card-body">
      <div class="card-meta-top">
        <span class="tag type-tag" :class="item.type">{{ item.type === 'lost' ? '遺失' : '拾獲' }}</span>
        <span class="tag status-tag" :class="item.status">{{ label }}</span>
      </div>
      <h2 class="card-title">{{ item.title }}</h2>
      <dl class="card-dl">
        <div><dt>分類</dt><dd>{{ item.category }}</dd></div>
        <div><dt>地點</dt><dd>{{ item.location || '—' }}</dd></div>
        <div><dt>日期</dt><dd>{{ item.date || '—' }}</dd></div>
      </dl>
      <p class="card-owner">by {{ item.owner_name || '匿名' }}</p>

      <div class="card-actions" v-if="canManage" @click.stop>
        <button class="act-btn" @click="$emit('edit', item)" :disabled="item.status !== 'active'">✦ 修改</button>
        <button class="act-btn" @click="$emit('status', item)">◎ 狀態</button>
        <button class="act-btn act-del" @click="$emit('delete', item)">✕ 刪除</button>
      </div>
    </div>
  </article>
</template>

<script>
import { statusLabel, defaultEmoji } from '../utils/api.js'

export default {
  props: {
    item:        { type: Object, required: true },
    canManage:   { type: Boolean, default: false },
    uploadsBase: { type: String, default: '/uploads' },
  },
  emits: ['view', 'edit', 'status', 'delete', 'lightbox'],
  computed: {
    label() { return statusLabel(this.item.status) },
    emoji() { return defaultEmoji(this.item.category) },
  },
}
</script>
