<template>
  <Teleport to="body">
    <div v-if="item" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-sheet">
        <button class="sheet-close" @click="$emit('close')">✕</button>
        <div class="sheet-body">
          <h2 class="sheet-title">修改刊登</h2>
          <form class="editorial-form" @submit.prevent="submit">
            <div class="form-row">
              <label>類型</label>
              <select v-model="form.type" required>
                <option value="lost">遺失物</option>
                <option value="found">拾獲物</option>
              </select>
            </div>
            <div class="form-row">
              <label>名稱</label>
              <input type="text" v-model="form.title" required />
            </div>
            <div class="form-row">
              <label>分類</label>
              <select v-model="form.category">
                <option value="電子產品">電子產品</option>
                <option value="文具書籍">文具書籍</option>
                <option value="皮夾證件">皮夾證件</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div class="form-row">
              <label>更換圖片</label>
              <div class="file-area">
                <input type="file" id="edit-file-upload" @change="handleFile" accept="image/*" />
                <label for="edit-file-upload" class="file-label">選擇圖片（不選則保留原圖）</label>
                <img v-if="preview" :src="preview" class="preview-thumb" />
                <img v-else-if="item.image" :src="`${uploadsBase}/${item.image}`" class="preview-thumb" />
              </div>
            </div>
            <div class="form-row">
              <label>日期</label>
              <input type="date" v-model="form.date" />
            </div>
            <div class="form-row">
              <label>地點</label>
              <input type="text" v-model="form.location" />
            </div>
            <div class="form-row form-row-col">
              <label>特徵描述</label>
              <textarea v-model="form.description" rows="3"></textarea>
            </div>
            <div class="form-submit">
              <button type="submit" class="submit-btn">儲存修改</button>
              <button type="button" class="cancel-btn" @click="$emit('close')">取消</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { API_BASE, authHeaders } from '../utils/api.js'

export default {
  props: {
    item:        { type: Object, default: null },
    uploadsBase: { type: String, default: '/uploads' },
  },
  emits: ['close', 'saved', 'toast'],
  data() {
    return { form: {}, file: null, preview: null }
  },
  watch: {
    item(val) {
      if (val) {
        this.form = { type: val.type, title: val.title, category: val.category, date: val.date, location: val.location, description: val.description }
        this.file = null; this.preview = null
      }
    },
  },
  methods: {
    handleFile(e) {
      const f = e.target.files[0]
      if (f) { this.file = f; this.preview = URL.createObjectURL(f) }
    },
    async submit() {
      try {
        const fd = new FormData()
        Object.entries(this.form).forEach(([k, v]) => fd.append(k, v))
        if (this.file) fd.append('image', this.file)
        const r = await fetch(`${API_BASE}/items/${this.item.id}`, { method: 'PUT', headers: authHeaders(), body: fd })
        if (r.ok) {
          this.$emit('toast', '修改成功！')
          this.$emit('saved')
        } else {
          const e = await r.json()
          this.$emit('toast', `修改失敗：${e.error}`, 'error')
        }
      } catch { this.$emit('toast', '連線失敗', 'error') }
    },
  },
}
</script>
