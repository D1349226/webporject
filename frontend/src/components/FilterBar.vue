<template>
  <div class="filter-section">
    <div class="status-strip">
      <button
        v-for="tab in statusTabs" :key="tab.value"
        :class="['strip-btn', { 'strip-active': filters.status === tab.value }]"
        @click="$emit('status-filter', tab.value)"
      >{{ tab.label }} <span class="strip-count">{{ counts[tab.value] ?? 0 }}</span></button>
    </div>
    <div class="search-row">
      <select :value="filters.type" @change="$emit('update:filters', { ...filters, type: $event.target.value })">
        <option value="">全部類型</option>
        <option value="lost">遺失物</option>
        <option value="found">拾獲物</option>
      </select>
      <select :value="filters.category" @change="$emit('update:filters', { ...filters, category: $event.target.value })">
        <option value="">全部分類</option>
        <option value="電子產品">電子產品</option>
        <option value="文具書籍">文具書籍</option>
        <option value="皮夾證件">皮夾證件</option>
        <option value="其他">其他</option>
      </select>
      <input type="text" :value="filters.search" placeholder="搜尋關鍵字⋯"
        @input="$emit('update:filters', { ...filters, search: $event.target.value })" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    statusTabs: { type: Array, required: true },
    filters:    { type: Object, required: true },
    counts:     { type: Object, required: true },
  },
  emits: ['status-filter', 'update:filters'],
}
</script>
