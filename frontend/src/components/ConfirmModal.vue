<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click.self="$emit('cancel')">
      <div class="modal-sheet modal-compact">
        <button class="sheet-close" @click="$emit('cancel')">✕</button>
        <div class="sheet-body">
          <h2 class="sheet-title">{{ title }}</h2>
          <p class="sheet-subtitle">{{ message }}</p>
          <div class="form-submit">
            <button class="submit-btn submit-danger" @click="$emit('confirm')">{{ confirmLabel }}</button>
            <button class="cancel-btn" @click="$emit('cancel')">取消</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  props: {
    visible:      { type: Boolean, default: false },
    title:        { type: String, required: true },
    message:      { type: String, required: true },
    confirmLabel: { type: String, default: '確定' },
  },
  emits: ['confirm', 'cancel'],
}
</script>
