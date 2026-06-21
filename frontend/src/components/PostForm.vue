<template>
  <main class="page page-form">
    <h2 class="page-heading">發布啟事</h2>
    <form class="editorial-form" @submit.prevent="submit">
      <div class="form-row">
        <label>類型</label>
        <select v-model="form.type" required>
          <option value="lost">我弄丟了東西（遺失物）</option>
          <option value="found">我撿到了東西（拾獲物）</option>
        </select>
      </div>
      <div class="form-row">
        <label>名稱</label>
        <input type="text" v-model="form.title" required placeholder="例如：iPhone 15、黑色皮夾" />
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
        <label>圖片</label>
        <div class="file-area">
          <input type="file" id="file-upload" @change="handleFile" accept="image/*" />
          <label for="file-upload" class="file-label">選擇圖片（上限 5MB）</label>
          <img v-if="preview" :src="preview" class="preview-thumb" />
        </div>
      </div>
      <div class="form-row">
        <label>日期</label>
        <input type="date" v-model="form.date" />
      </div>
      <div class="form-row">
        <label>地點</label>
        <input type="text" v-model="form.location" placeholder="例如：工程四館 101 教室" />
      </div>
      <div class="form-row form-row-col">
        <label>特徵描述</label>
        <textarea v-model="form.description" rows="4" placeholder="外觀顏色、特殊標記⋯"></textarea>
      </div>
      <div class="form-submit">
        <button type="submit" class="submit-btn">發布</button>
      </div>
    </form>
  </main>
</template>

<script>
import { API_BASE, authHeaders } from '../utils/api.js'

const blank = () => ({ type: 'lost', title: '', category: '其他', date: '', location: '', description: '' })

export default {
  emits: ['submitted', 'toast'],
  data() {
    return { form: blank(), file: null, preview: null }
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
        const r = await fetch(`${API_BASE}/items`, { method: 'POST', headers: authHeaders(), body: fd })
        if (r.ok) {
          this.$emit('toast', '發布成功！')
          this.$emit('submitted')
          this.form = blank(); this.file = null; this.preview = null
        } else {
          const e = await r.json()
          this.$emit('toast', `發布失敗：${e.error}`, 'error')
        }
      } catch { this.$emit('toast', '連線失敗', 'error') }
    },
  },
}
</script>
