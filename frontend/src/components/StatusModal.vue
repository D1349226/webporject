<template>
  <Teleport to="body">
    <div v-if="item" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-sheet modal-compact">
        <button class="sheet-close" @click="$emit('close')">✕</button>
        <div class="sheet-body">
          <h2 class="sheet-title">更改狀態</h2>
          <p class="sheet-subtitle">{{ item.title }}</p>
          <div class="status-choice">
            <button :class="['choice-btn', 'active', { chosen: item.status === 'active' }]"
              :disabled="item.status === 'active'" @click="$emit('set-status', item, 'active')">
              <span class="choice-dot active"></span>待認領
            </button>
            <button :class="['choice-btn', 'closed', { chosen: item.status === 'closed' }]"
              :disabled="item.status === 'closed'" @click="$emit('set-status', item, 'closed')">
              <span class="choice-dot closed"></span>已結案
            </button>
            <button :class="['choice-btn', 'claimed', { chosen: item.status === 'claimed' }]"
              :disabled="item.status === 'claimed'" @click="$emit('set-status', item, 'claimed')">
              <span class="choice-dot claimed"></span>已認領
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  props: { item: { type: Object, default: null } },
  emits: ['close', 'set-status'],
}
</script>
