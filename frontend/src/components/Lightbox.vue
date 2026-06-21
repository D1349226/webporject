<template>
  <Teleport to="body">
    <div v-if="image" class="lightbox" @click="$emit('close')">
      <img :src="`${uploadsBase}/${image}`" />
      <button class="lightbox-close" @click="$emit('close')">✕</button>
    </div>
  </Teleport>
</template>

<script>
export default {
  props: {
    image:       { type: String, default: null },
    uploadsBase: { type: String, default: '/uploads' },
  },
  emits: ['close'],
}
</script>
