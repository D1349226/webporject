<template>
  <Teleport to="body">
    <transition-group name="toast" tag="div" class="toast-stack">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
    </transition-group>
  </Teleport>
</template>

<script>
export default {
  props: { toasts: { type: Array, required: true } },
}
</script>
