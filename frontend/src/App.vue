<template>
  <Auth v-if="!currentUser" @logged-in="onLoggedIn" />

  <div v-else class="layout">
    <Masthead
      :currentUser="currentUser"
      :currentTab="currentTab"
      :trashCount="trashItems.length"
      @tab="onTabChange"
      @logout="logout"
    />

    <!-- 列表 -->
    <main v-if="currentTab === 'list'" class="page">
      <FilterBar
        :statusTabs="statusTabs"
        :filters="filters"
        :counts="counts"
        @status-filter="setStatusFilter"
        @update:filters="onFiltersChange"
      />

      <div class="card-grid">
        <ItemCard
          v-for="item in items" :key="item.id"
          :item="item"
          :canManage="canManage(item)"
          :uploadsBase="uploadsBase"
          @view="viewDetail"
          @edit="openEdit"
          @status="statusModalItem = $event"
          @delete="deletingItem = $event"
          @lightbox="lightboxImage = $event"
        />
      </div>

      <footer class="pager" v-if="total > 0">
        <button class="pager-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">← 上一頁</button>
        <span class="pager-info">{{ currentPage }} / {{ totalPages }}　共 {{ total }} 筆</span>
        <button class="pager-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">下一頁 →</button>
      </footer>
      <p v-else class="empty-hint">沒有符合條件的物品</p>
    </main>

    <!-- 發布 -->
    <PostForm v-if="currentTab === 'post'" @submitted="onPosted" @toast="showToast" />

    <!-- 垃圾桶 -->
    <TrashList v-if="currentTab === 'trash'"
      :items="trashItems"
      :uploadsBase="uploadsBase"
      @restore="restoreItem"
      @permanent-delete="permanentDeletingItem = $event"
    />

    <!-- 使用者管理 -->
    <main v-if="currentTab === 'admin'" class="page">
      <AdminPanel :currentUser="currentUser" @toast="showToast" />
    </main>

    <!-- Modals -->
    <DetailModal
      :item="selectedItem"
      :uploadsBase="uploadsBase"
      @close="selectedItem = null"
      @claimed="onClaimed"
      @lightbox="lightboxImage = $event"
      @toast="showToast"
    />

    <EditModal
      :item="editingItem"
      :uploadsBase="uploadsBase"
      @close="editingItem = null"
      @saved="onSaved"
      @toast="showToast"
    />

    <StatusModal
      :item="statusModalItem"
      @close="statusModalItem = null"
      @set-status="setStatus"
    />

    <ConfirmModal
      :visible="!!deletingItem"
      title="移至垃圾桶"
      :message="`「${deletingItem?.title}」將移至垃圾桶，可隨時還原。`"
      confirmLabel="確定"
      @confirm="deleteItem"
      @cancel="deletingItem = null"
    />

    <ConfirmModal
      :visible="!!permanentDeletingItem"
      title="永久刪除"
      :message="`「${permanentDeletingItem?.title}」將被永久刪除，此操作無法復原。`"
      confirmLabel="確定永久刪除"
      @confirm="permanentDeleteItem"
      @cancel="permanentDeletingItem = null"
    />

    <Lightbox :image="lightboxImage" :uploadsBase="uploadsBase" @close="lightboxImage = null" />
    <ToastStack :toasts="toasts" />
  </div>
</template>

<script>
import Auth        from './components/Auth.vue'
import AdminPanel  from './components/AdminPanel.vue'
import Masthead    from './components/Masthead.vue'
import FilterBar   from './components/FilterBar.vue'
import ItemCard    from './components/ItemCard.vue'
import PostForm    from './components/PostForm.vue'
import TrashList   from './components/TrashList.vue'
import DetailModal from './components/DetailModal.vue'
import EditModal   from './components/EditModal.vue'
import StatusModal from './components/StatusModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import Lightbox    from './components/Lightbox.vue'
import ToastStack  from './components/ToastStack.vue'
import { API_BASE, authHeaders, statusLabel } from './utils/api.js'

const PAGE_SIZE = 10
const STATUS_TABS = [
  { value: 'all',     label: '全部' },
  { value: 'active',  label: '待認領' },
  { value: 'claimed', label: '已認領' },
  { value: 'closed',  label: '已結案' },
]

export default {
  components: { Auth, AdminPanel, Masthead, FilterBar, ItemCard, PostForm, TrashList, DetailModal, EditModal, StatusModal, ConfirmModal, Lightbox, ToastStack },

  data() {
    return {
      currentUser: null,
      currentTab: 'list',
      items: [], total: 0, currentPage: 1,
      counts: { all: 0, active: 0, claimed: 0, closed: 0 },
      statusTabs: STATUS_TABS,
      filters: { status: 'all', type: '', category: '', search: '' },
      selectedItem: null,
      editingItem: null,
      statusModalItem: null,
      deletingItem: null,
      permanentDeletingItem: null,
      trashItems: [],
      lightboxImage: null,
      toasts: [], toastSeq: 0,
      uploadsBase: (import.meta.env.VITE_API_BASE_URL || '').replace('/api', '') + '/uploads',
    }
  },

  computed: {
    totalPages() { return Math.ceil(this.total / PAGE_SIZE) || 1 },
  },

  mounted() {
    const saved = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (saved && token) { this.currentUser = JSON.parse(saved); this.fetchItems(); this.fetchCounts() }
    window.addEventListener('keydown', this.onKeydown)
  },
  beforeUnmount() { window.removeEventListener('keydown', this.onKeydown) },

  methods: {
    onLoggedIn(user) { this.currentUser = user; this.fetchItems(); this.fetchCounts() },
    logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); this.currentUser = null; this.items = [] },
    canManage(item) { return this.currentUser?.role === 'admin' || item.owner_id === this.currentUser?.id },
    onKeydown(e) { if (e.key === 'Escape') { this.lightboxImage = null; this.selectedItem = null } },

    showToast(message, type = 'success') {
      const id = ++this.toastSeq
      this.toasts.push({ id, message, type })
      setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id) }, 3000)
    },

    onTabChange(tab) {
      this.currentTab = tab
      if (tab === 'trash') this.fetchTrash()
    },

    onFiltersChange(newFilters) {
      this.filters = newFilters
      this.currentPage = 1
      this.fetchItems()
    },

    setStatusFilter(v) {
      this.filters = { ...this.filters, status: v }
      this.currentPage = 1
      this.fetchItems()
    },

    async fetchItems() {
      const { type, category, search, status } = this.filters
      const p = new URLSearchParams({ type, category, search, page: this.currentPage, limit: PAGE_SIZE })
      if (status && status !== 'all') p.set('status', status)
      try {
        const r = await fetch(`${API_BASE}/items?${p}`)
        const d = await r.json()
        this.items = d.items; this.total = d.total
      } catch { this.showToast('無法載入物品列表', 'error') }
    },

    async fetchCounts() {
      try { const r = await fetch(`${API_BASE}/items/counts`); this.counts = await r.json() } catch {}
    },

    goToPage(p) {
      if (p < 1 || p > this.totalPages) return
      this.currentPage = p; this.fetchItems(); window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    async viewDetail(id) {
      try { const r = await fetch(`${API_BASE}/items/${id}`); this.selectedItem = await r.json() }
      catch { this.showToast('無法載入詳細資訊', 'error') }
    },

    openEdit(item) { this.editingItem = item },

    onPosted() { this.currentTab = 'list'; this.fetchItems(); this.fetchCounts() },

    onClaimed() { this.selectedItem = null; this.fetchItems(); this.fetchCounts() },

    onSaved() { this.editingItem = null; this.fetchItems() },

    async setStatus(item, status) {
      try {
        const r = await fetch(`${API_BASE}/items/${item.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ status }),
        })
        if (r.ok) {
          this.showToast(`已更新為「${statusLabel(status)}」`)
          this.statusModalItem = null
          this.fetchItems(); this.fetchCounts()
        } else {
          const e = await r.json(); this.showToast(e.error, 'error')
        }
      } catch { this.showToast('連線失敗', 'error') }
    },

    async deleteItem() {
      try {
        const r = await fetch(`${API_BASE}/items/${this.deletingItem.id}`, { method: 'DELETE', headers: authHeaders() })
        if (r.ok) { this.showToast('已移至垃圾桶'); this.deletingItem = null; this.fetchItems(); this.fetchCounts() }
        else { const e = await r.json(); this.showToast(e.error, 'error') }
      } catch { this.showToast('連線失敗', 'error') }
    },

    async fetchTrash() {
      try { const r = await fetch(`${API_BASE}/items/trash`, { headers: authHeaders() }); this.trashItems = await r.json() }
      catch { this.showToast('無法載入垃圾桶', 'error') }
    },

    async restoreItem(item) {
      try {
        const r = await fetch(`${API_BASE}/items/${item.id}/restore`, { method: 'PATCH', headers: authHeaders() })
        if (r.ok) { this.showToast('已還原'); this.fetchTrash(); this.fetchCounts() }
        else { const e = await r.json(); this.showToast(e.error, 'error') }
      } catch { this.showToast('連線失敗', 'error') }
    },

    async permanentDeleteItem() {
      try {
        const r = await fetch(`${API_BASE}/items/${this.permanentDeletingItem.id}/permanent`, { method: 'DELETE', headers: authHeaders() })
        if (r.ok) { this.showToast('永久刪除成功'); this.permanentDeletingItem = null; this.fetchTrash() }
        else { const e = await r.json(); this.showToast(e.error, 'error') }
      } catch { this.showToast('連線失敗', 'error') }
    },
  },
}
</script>
