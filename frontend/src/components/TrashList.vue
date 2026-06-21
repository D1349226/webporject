<template>
  <main class="page">
    <h2 class="page-heading">垃圾桶</h2>
    <p v-if="!items.length" class="empty-hint">垃圾桶是空的</p>
    <div class="card-grid">
      <article v-for="item in items" :key="item.id" class="item-card deleted">
        <div class="card-photo">
          <img v-if="item.image" :src="`${uploadsBase}/${item.image}`" :alt="item.title" />
          <div v-else class="card-photo-empty">{{ emoji(item.category) }}</div>
          <div class="card-status-bar deleted"></div>
        </div>
        <div class="card-body">
          <div class="card-meta-top">
            <span class="tag type-tag" :class="item.type">{{ item.type === 'lost' ? '遺失' : '拾獲' }}</span>
            <span class="tag status-tag deleted">已刪除</span>
          </div>
          <h2 class="card-title">{{ item.title }}</h2>
          <p class="card-owner">by {{ item.owner_name || '匿名' }}</p>
          <div class="card-actions">
            <button class="act-btn" @click="$emit('restore', item)">↩ 還原</button>
            <button class="act-btn act-del" @click="$emit('permanent-delete', item)">✕ 永久刪除</button>
          </div>
        </div>
      </article>
    </div>
  </main>
</template>

<script>
import { defaultEmoji } from '../utils/api.js'

export default {
  props: {
    items:       { type: Array, required: true },
    uploadsBase: { type: String, default: '/uploads' },
  },
  emits: ['restore', 'permanent-delete'],
  methods: {
    emoji: defaultEmoji,
  },
}
</script>
