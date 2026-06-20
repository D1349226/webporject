<template>
  <Auth v-if="!currentUser" @logged-in="onLoggedIn" />

  <div v-else class="layout">

    <!-- ── Masthead ── -->
    <header class="masthead">
      <div class="masthead-inner">
        <div class="masthead-title">
          <span class="masthead-sub">校園</span>
          <h1>失物招領</h1>
        </div>
        <nav class="masthead-nav">
          <a :class="{ 'nav-active': currentTab === 'list' }" @click="currentTab = 'list'">列表</a>
          <a :class="{ 'nav-active': currentTab === 'post' }" @click="currentTab = 'post'">發布</a>
          <a :class="{ 'nav-active': currentTab === 'trash' }" @click="currentTab = 'trash'; fetchTrash()">
            垃圾桶<sup v-if="trashItems.length">{{ trashItems.length }}</sup>
          </a>
          <a v-if="currentUser.role === 'admin'" :class="{ 'nav-active': currentTab === 'admin' }" @click="currentTab = 'admin'">使用者</a>
          <span class="nav-divider">|</span>
          <span class="nav-user">
            <em class="role-mark" :class="currentUser.role">{{ currentUser.role === 'admin' ? 'Admin' : 'User' }}</em>
            {{ currentUser.username }}
          </span>
          <a class="nav-logout" @click="logout">登出</a>
        </nav>
      </div>
      <div class="masthead-rule"></div>
    </header>

    <!-- ── 列表頁 ── -->
    <main v-if="currentTab === 'list'" class="page">

      <!-- 狀態篩選 -->
      <div class="filter-section">
        <div class="status-strip">
          <button
            v-for="tab in statusTabs" :key="tab.value"
            :class="['strip-btn', { 'strip-active': filters.status === tab.value }]"
            @click="setStatusFilter(tab.value)"
          >{{ tab.label }} <span class="strip-count">{{ counts[tab.value] ?? 0 }}</span></button>
        </div>
        <div class="search-row">
          <select v-model="filters.type" @change="resetAndFetch">
            <option value="">全部類型</option>
            <option value="lost">遺失物</option>
            <option value="found">拾獲物</option>
          </select>
          <select v-model="filters.category" @change="resetAndFetch">
            <option value="">全部分類</option>
            <option value="電子產品">電子產品</option>
            <option value="文具書籍">文具書籍</option>
            <option value="皮夾證件">皮夾證件</option>
            <option value="其他">其他</option>
          </select>
          <input type="text" v-model="filters.search" placeholder="搜尋關鍵字⋯" @input="resetAndFetch" />
        </div>
      </div>

      <!-- 卡片格 -->
      <div class="card-grid">
        <article v-for="item in items" :key="item.id"
          class="item-card" :class="item.status"
          @click="viewDetail(item.id)"
        >
          <!-- 圖片區 -->
          <div class="card-photo" @click.stop="item.image && openLightbox(item.image)" :class="{ 'photo-zoom': item.image }">
            <img v-if="item.image" :src="`/uploads/${item.image}`" :alt="item.title" />
            <div v-else class="card-photo-empty">{{ getDefaultEmoji(item.category) }}</div>
            <!-- 狀態色條 -->
            <div class="card-status-bar" :class="item.status"></div>
          </div>

          <!-- 內文 -->
          <div class="card-body">
            <div class="card-meta-top">
              <span class="tag type-tag" :class="item.type">{{ item.type === 'lost' ? '遺失' : '拾獲' }}</span>
              <span class="tag status-tag" :class="item.status">{{ statusLabel(item.status) }}</span>
            </div>
            <h2 class="card-title">{{ item.title }}</h2>
            <dl class="card-dl">
              <div><dt>分類</dt><dd>{{ item.category }}</dd></div>
              <div><dt>地點</dt><dd>{{ item.location || '—' }}</dd></div>
              <div><dt>日期</dt><dd>{{ item.date || '—' }}</dd></div>
            </dl>
            <p class="card-owner">by {{ item.owner_name || '匿名' }}</p>

            <div class="card-actions" v-if="canManage(item)" @click.stop>
              <button class="act-btn" @click="openEditForm(item)" :disabled="item.status !== 'active'">✦ 修改</button>
              <button class="act-btn" @click="openStatusModal(item)">◎ 狀態</button>
              <button class="act-btn act-del" @click="confirmDelete(item)">✕ 刪除</button>
            </div>
          </div>
        </article>
      </div>

      <!-- 分頁 -->
      <footer class="pager" v-if="total > 0">
        <button class="pager-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">← 上一頁</button>
        <span class="pager-info">{{ currentPage }} / {{ totalPages }}　共 {{ total }} 筆</span>
        <button class="pager-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">下一頁 →</button>
      </footer>
      <p v-else class="empty-hint">沒有符合條件的物品</p>
    </main>

    <!-- ── 發布頁 ── -->
    <main v-if="currentTab === 'post'" class="page page-form">
      <h2 class="page-heading">發布啟事</h2>
      <form class="editorial-form" @submit.prevent="submitItem">
        <div class="form-row">
          <label>類型</label>
          <select v-model="newItem.type" required>
            <option value="lost">我弄丟了東西（遺失物）</option>
            <option value="found">我撿到了東西（拾獲物）</option>
          </select>
        </div>
        <div class="form-row">
          <label>名稱</label>
          <input type="text" v-model="newItem.title" required placeholder="例如：iPhone 15、黑色皮夾" />
        </div>
        <div class="form-row">
          <label>分類</label>
          <select v-model="newItem.category">
            <option value="電子產品">電子產品</option>
            <option value="文具書籍">文具書籍</option>
            <option value="皮夾證件">皮夾證件</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div class="form-row">
          <label>圖片</label>
          <div class="file-area">
            <input type="file" id="file-upload" @change="handleFileUpload" accept="image/*" />
            <label for="file-upload" class="file-label">選擇圖片（上限 5MB）</label>
            <img v-if="imagePreview" :src="imagePreview" class="preview-thumb" />
          </div>
        </div>
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="newItem.date" />
        </div>
        <div class="form-row">
          <label>地點</label>
          <input type="text" v-model="newItem.location" placeholder="例如：工程四館 101 教室" />
        </div>
        <div class="form-row form-row-col">
          <label>特徵描述</label>
          <textarea v-model="newItem.description" rows="4" placeholder="外觀顏色、特殊標記⋯"></textarea>
        </div>
        <div class="form-submit">
          <button type="submit" class="submit-btn">發布</button>
        </div>
      </form>
    </main>

    <!-- ── 垃圾桶 ── -->
    <main v-if="currentTab === 'trash'" class="page">
      <h2 class="page-heading">垃圾桶</h2>
      <p v-if="!trashItems.length" class="empty-hint">垃圾桶是空的</p>
      <div class="card-grid">
        <article v-for="item in trashItems" :key="item.id" class="item-card deleted">
          <div class="card-photo">
            <img v-if="item.image" :src="`/uploads/${item.image}`" :alt="item.title" />
            <div v-else class="card-photo-empty">{{ getDefaultEmoji(item.category) }}</div>
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
              <button class="act-btn" @click="restoreItem(item)">↩ 還原</button>
              <button class="act-btn act-del" @click="confirmPermanentDelete(item)">✕ 永久刪除</button>
            </div>
          </div>
        </article>
      </div>
    </main>

    <!-- ── 使用者管理 ── -->
    <main v-if="currentTab === 'admin'" class="page">
      <AdminPanel :currentUser="currentUser" @toast="showToast" />
    </main>

    <!-- ── 詳情 Modal ── -->
    <Teleport to="body">
      <div v-if="selectedItem" class="modal-backdrop" @click.self="selectedItem = null">
        <div class="modal-sheet">
          <button class="sheet-close" @click="selectedItem = null">✕</button>

          <div class="sheet-photo" v-if="selectedItem.image" @click="openLightbox(selectedItem.image)">
            <img :src="`/uploads/${selectedItem.image}`" />
            <span class="sheet-zoom-hint">點擊放大</span>
          </div>
          <div class="sheet-photo sheet-photo-empty" v-else>{{ getDefaultEmoji(selectedItem.category) }}</div>

          <div class="sheet-body">
            <div class="sheet-tags">
              <span class="tag type-tag" :class="selectedItem.type">{{ selectedItem.type === 'lost' ? '遺失' : '拾獲' }}</span>
              <span class="tag status-tag" :class="selectedItem.status">{{ statusLabel(selectedItem.status) }}</span>
            </div>
            <h2 class="sheet-title">{{ selectedItem.title }}</h2>
            <dl class="sheet-dl">
              <div><dt>分類</dt><dd>{{ selectedItem.category }}</dd></div>
              <div><dt>時間</dt><dd>{{ selectedItem.date || '—' }}</dd></div>
              <div><dt>地點</dt><dd>{{ selectedItem.location || '—' }}</dd></div>
              <div><dt>發布者</dt><dd>{{ selectedItem.owner_name || '匿名' }}</dd></div>
              <div v-if="selectedItem.description"><dt>描述</dt><dd>{{ selectedItem.description }}</dd></div>
            </dl>

            <div v-if="selectedItem.status === 'active'" class="claim-section">
              <h3 class="claim-heading">申請認領 / 聯絡告知</h3>
              <form class="editorial-form" @submit.prevent="submitClaim">
                <div class="form-row">
                  <label>您的稱呼</label>
                  <input type="text" v-model="claimForm.claimer_name" placeholder="例如：王同學" required />
                </div>
                <div class="form-row">
                  <label>聯絡方式</label>
                  <input type="text" v-model="claimForm.contact_info" placeholder="電話 / Email" required />
                </div>
                <div class="form-row form-row-col">
                  <label>認領說明</label>
                  <textarea v-model="claimForm.claim_reason" rows="3" placeholder="說明認領依據或約定面交方式⋯"></textarea>
                </div>
                <div class="form-submit">
                  <button type="submit" class="submit-btn">提交認領</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── 修改 Modal ── -->
    <Teleport to="body">
      <div v-if="editingItem" class="modal-backdrop" @click.self="closeEditForm">
        <div class="modal-sheet">
          <button class="sheet-close" @click="closeEditForm">✕</button>
          <div class="sheet-body">
            <h2 class="sheet-title">修改刊登</h2>
            <form class="editorial-form" @submit.prevent="submitEdit">
              <div class="form-row">
                <label>類型</label>
                <select v-model="editForm.type" required>
                  <option value="lost">遺失物</option>
                  <option value="found">拾獲物</option>
                </select>
              </div>
              <div class="form-row">
                <label>名稱</label>
                <input type="text" v-model="editForm.title" required />
              </div>
              <div class="form-row">
                <label>分類</label>
                <select v-model="editForm.category">
                  <option value="電子產品">電子產品</option>
                  <option value="文具書籍">文具書籍</option>
                  <option value="皮夾證件">皮夾證件</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div class="form-row">
                <label>更換圖片</label>
                <div class="file-area">
                  <input type="file" id="edit-file-upload" @change="handleEditFileUpload" accept="image/*" />
                  <label for="edit-file-upload" class="file-label">選擇圖片（不選則保留原圖）</label>
                  <img v-if="editImagePreview" :src="editImagePreview" class="preview-thumb" />
                  <img v-else-if="editingItem.image" :src="`/uploads/${editingItem.image}`" class="preview-thumb" />
                </div>
              </div>
              <div class="form-row">
                <label>日期</label>
                <input type="date" v-model="editForm.date" />
              </div>
              <div class="form-row">
                <label>地點</label>
                <input type="text" v-model="editForm.location" />
              </div>
              <div class="form-row form-row-col">
                <label>特徵描述</label>
                <textarea v-model="editForm.description" rows="3"></textarea>
              </div>
              <div class="form-submit">
                <button type="submit" class="submit-btn">儲存修改</button>
                <button type="button" class="cancel-btn" @click="closeEditForm">取消</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── 狀態切換 Modal ── -->
    <Teleport to="body">
      <div v-if="statusModalItem" class="modal-backdrop" @click.self="statusModalItem = null">
        <div class="modal-sheet modal-compact">
          <button class="sheet-close" @click="statusModalItem = null">✕</button>
          <div class="sheet-body">
            <h2 class="sheet-title">更改狀態</h2>
            <p class="sheet-subtitle">{{ statusModalItem.title }}</p>
            <div class="status-choice">
              <button :class="['choice-btn', 'active', { chosen: statusModalItem.status === 'active' }]"
                :disabled="statusModalItem.status === 'active'" @click="setStatus(statusModalItem, 'active')">
                <span class="choice-dot active"></span>待認領
              </button>
              <button :class="['choice-btn', 'closed', { chosen: statusModalItem.status === 'closed' }]"
                :disabled="statusModalItem.status === 'closed'" @click="setStatus(statusModalItem, 'closed')">
                <span class="choice-dot closed"></span>已結案
              </button>
              <button :class="['choice-btn', 'claimed', { chosen: statusModalItem.status === 'claimed' }]"
                :disabled="statusModalItem.status === 'claimed'" @click="setStatus(statusModalItem, 'claimed')">
                <span class="choice-dot claimed"></span>已認領
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── 刪除確認 ── -->
    <Teleport to="body">
      <div v-if="deletingItem" class="modal-backdrop" @click.self="deletingItem = null">
        <div class="modal-sheet modal-compact">
          <button class="sheet-close" @click="deletingItem = null">✕</button>
          <div class="sheet-body">
            <h2 class="sheet-title">移至垃圾桶</h2>
            <p class="sheet-subtitle">「{{ deletingItem.title }}」將移至垃圾桶，可隨時還原。</p>
            <div class="form-submit">
              <button class="submit-btn submit-danger" @click="deleteItem">確定</button>
              <button class="cancel-btn" @click="deletingItem = null">取消</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── 永久刪除確認 ── -->
    <Teleport to="body">
      <div v-if="permanentDeletingItem" class="modal-backdrop" @click.self="permanentDeletingItem = null">
        <div class="modal-sheet modal-compact">
          <button class="sheet-close" @click="permanentDeletingItem = null">✕</button>
          <div class="sheet-body">
            <h2 class="sheet-title">永久刪除</h2>
            <p class="sheet-subtitle">「{{ permanentDeletingItem.title }}」將被永久刪除，此操作無法復原。</p>
            <div class="form-submit">
              <button class="submit-btn submit-danger" @click="permanentDeleteItem">確定永久刪除</button>
              <button class="cancel-btn" @click="permanentDeletingItem = null">取消</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Lightbox ── -->
    <Teleport to="body">
      <div v-if="lightboxImage" class="lightbox" @click="lightboxImage = null">
        <img :src="`/uploads/${lightboxImage}`" />
        <button class="lightbox-close" @click="lightboxImage = null">✕</button>
      </div>
    </Teleport>

    <!-- ── Toast ── -->
    <Teleport to="body">
      <transition-group name="toast" tag="div" class="toast-stack">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
      </transition-group>
    </Teleport>
  </div>
</template>

<script>
import Auth from './components/Auth.vue';
import AdminPanel from './components/AdminPanel.vue';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const PAGE_SIZE = 10;
const STATUS_TABS = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '待認領' },
  { value: 'claimed', label: '已認領' },
  { value: 'closed', label: '已結案' },
];

export default {
  components: { Auth, AdminPanel },
  data() {
    return {
      currentUser: null,
      currentTab: 'list',
      items: [], total: 0, currentPage: 1,
      counts: { all: 0, active: 0, claimed: 0, closed: 0 },
      statusTabs: STATUS_TABS,
      filters: { status: 'all', type: '', category: '', search: '' },

      newItem: { type: 'lost', title: '', category: '其他', date: '', location: '', description: '' },
      selectedFile: null, imagePreview: null,

      selectedItem: null,
      claimForm: { claimer_name: '', contact_info: '', claim_reason: '' },

      editingItem: null, editForm: {}, editSelectedFile: null, editImagePreview: null,
      statusModalItem: null,
      deletingItem: null, permanentDeletingItem: null,
      trashItems: [],
      lightboxImage: null,
      toasts: [], toastSeq: 0,
    };
  },
  computed: {
    totalPages() { return Math.ceil(this.total / PAGE_SIZE) || 1; }
  },
  mounted() {
    const saved = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (saved && token) { this.currentUser = JSON.parse(saved); this.fetchItems(); this.fetchCounts(); }
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeUnmount() { window.removeEventListener('keydown', this.onKeydown); },
  methods: {
    onLoggedIn(user) { this.currentUser = user; this.fetchItems(); this.fetchCounts(); },
    logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); this.currentUser = null; this.items = []; },
    authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; },
    canManage(item) { return this.currentUser?.role === 'admin' || item.owner_id === this.currentUser?.id; },
    onKeydown(e) { if (e.key === 'Escape') { this.lightboxImage = null; this.selectedItem = null; } },

    showToast(message, type = 'success') {
      const id = ++this.toastSeq;
      this.toasts.push({ id, message, type });
      setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 3000);
    },
    statusLabel(s) { return { active: '待認領', claimed: '已認領', closed: '已結案', deleted: '已刪除' }[s] || s; },

    async fetchItems() {
      const { type, category, search, status } = this.filters;
      const p = new URLSearchParams({ type, category, search, page: this.currentPage, limit: PAGE_SIZE });
      if (status && status !== 'all') p.set('status', status);
      try { const r = await fetch(`${API_BASE}/items?${p}`); const d = await r.json(); this.items = d.items; this.total = d.total; }
      catch { this.showToast('無法載入物品列表', 'error'); }
    },
    async fetchCounts() {
      try { const r = await fetch(`${API_BASE}/items/counts`); this.counts = await r.json(); } catch {}
    },
    resetAndFetch() { this.currentPage = 1; this.fetchItems(); },
    setStatusFilter(v) { this.filters.status = v; this.resetAndFetch(); },
    goToPage(p) {
      if (p < 1 || p > this.totalPages) return;
      this.currentPage = p; this.fetchItems(); window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    handleFileUpload(e) { const f = e.target.files[0]; if (f) { this.selectedFile = f; this.imagePreview = URL.createObjectURL(f); } },
    async submitItem() {
      try {
        const fd = new FormData();
        Object.entries(this.newItem).forEach(([k, v]) => fd.append(k, v));
        if (this.selectedFile) fd.append('image', this.selectedFile);
        const r = await fetch(`${API_BASE}/items`, { method: 'POST', headers: this.authHeaders(), body: fd });
        if (r.ok) {
          this.showToast('發布成功！');
          this.newItem = { type: 'lost', title: '', category: '其他', date: '', location: '', description: '' };
          this.selectedFile = null; this.imagePreview = null;
          this.currentTab = 'list'; this.resetAndFetch(); this.fetchCounts();
        } else { const e = await r.json(); this.showToast(`發布失敗：${e.error}`, 'error'); }
      } catch { this.showToast('連線失敗', 'error'); }
    },

    async viewDetail(id) {
      try { const r = await fetch(`${API_BASE}/items/${id}`); this.selectedItem = await r.json(); }
      catch { this.showToast('無法載入詳細資訊', 'error'); }
    },
    async submitClaim() {
      try {
        const r = await fetch(`${API_BASE}/claims`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
          body: JSON.stringify({ ...this.claimForm, item_id: this.selectedItem.id })
        });
        if (r.ok) {
          this.showToast('認領成功！'); this.selectedItem = null;
          this.claimForm = { claimer_name: '', contact_info: '', claim_reason: '' };
          this.fetchItems(); this.fetchCounts();
        } else { this.showToast('提交失敗', 'error'); }
      } catch { this.showToast('提交失敗', 'error'); }
    },

    openStatusModal(item) { this.statusModalItem = item; },
    async setStatus(item, status) {
      try {
        const r = await fetch(`${API_BASE}/items/${item.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
          body: JSON.stringify({ status })
        });
        if (r.ok) { this.showToast(`已更新為「${this.statusLabel(status)}」`); this.statusModalItem = null; this.fetchItems(); this.fetchCounts(); }
        else { const e = await r.json(); this.showToast(e.error, 'error'); }
      } catch { this.showToast('連線失敗', 'error'); }
    },

    openEditForm(item) {
      this.editingItem = item;
      this.editForm = { type: item.type, title: item.title, category: item.category, date: item.date, location: item.location, description: item.description };
      this.editSelectedFile = null; this.editImagePreview = null;
    },
    closeEditForm() { this.editingItem = null; this.editSelectedFile = null; this.editImagePreview = null; },
    handleEditFileUpload(e) { const f = e.target.files[0]; if (f) { this.editSelectedFile = f; this.editImagePreview = URL.createObjectURL(f); } },
    async submitEdit() {
      try {
        const fd = new FormData();
        Object.entries(this.editForm).forEach(([k, v]) => fd.append(k, v));
        if (this.editSelectedFile) fd.append('image', this.editSelectedFile);
        const r = await fetch(`${API_BASE}/items/${this.editingItem.id}`, { method: 'PUT', headers: this.authHeaders(), body: fd });
        if (r.ok) { this.showToast('修改成功！'); this.closeEditForm(); this.fetchItems(); }
        else { const e = await r.json(); this.showToast(`修改失敗：${e.error}`, 'error'); }
      } catch { this.showToast('連線失敗', 'error'); }
    },

    confirmDelete(item) { this.deletingItem = item; },
    async deleteItem() {
      try {
        const r = await fetch(`${API_BASE}/items/${this.deletingItem.id}`, { method: 'DELETE', headers: this.authHeaders() });
        if (r.ok) { this.showToast('已移至垃圾桶'); this.deletingItem = null; this.fetchItems(); this.fetchCounts(); }
        else { const e = await r.json(); this.showToast(e.error, 'error'); }
      } catch { this.showToast('連線失敗', 'error'); }
    },

    async fetchTrash() {
      try { const r = await fetch(`${API_BASE}/items/trash`, { headers: this.authHeaders() }); this.trashItems = await r.json(); }
      catch { this.showToast('無法載入垃圾桶', 'error'); }
    },
    async restoreItem(item) {
      try {
        const r = await fetch(`${API_BASE}/items/${item.id}/restore`, { method: 'PATCH', headers: this.authHeaders() });
        if (r.ok) { this.showToast('已還原'); this.fetchTrash(); this.fetchCounts(); }
        else { const e = await r.json(); this.showToast(e.error, 'error'); }
      } catch { this.showToast('連線失敗', 'error'); }
    },
    confirmPermanentDelete(item) { this.permanentDeletingItem = item; },
    async permanentDeleteItem() {
      try {
        const r = await fetch(`${API_BASE}/items/${this.permanentDeletingItem.id}/permanent`, { method: 'DELETE', headers: this.authHeaders() });
        if (r.ok) { this.showToast('永久刪除成功'); this.permanentDeletingItem = null; this.fetchTrash(); }
        else { const e = await r.json(); this.showToast(e.error, 'error'); }
      } catch { this.showToast('連線失敗', 'error'); }
    },

    openLightbox(image) { this.lightboxImage = image; },
    getDefaultEmoji(cat) { return { '電子產品': '💻', '文具書籍': '📚', '皮夾證件': '🪪' }[cat] || '📦'; }
  }
};
</script>

<style scoped>
/* ── Layout ── */
.layout { min-height: 100vh; }

/* ── Masthead ── */
.masthead { padding: 28px 40px 0; }
.masthead-inner { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.masthead-title { line-height: 1; }
.masthead-sub { display: block; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #8C7E6A; margin-bottom: 4px; font-family: system-ui, sans-serif; }
.masthead h1 { margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -0.02em; color: #1E1C19; font-family: 'Georgia', serif; }
.masthead-rule { margin-top: 20px; border: none; border-top: 1px solid #C8BFB0; }

.masthead-nav { display: flex; align-items: center; gap: 24px; font-family: system-ui, sans-serif; font-size: 13px; }
.masthead-nav a { color: #6B5F4F; text-decoration: none; cursor: pointer; letter-spacing: 0.03em; transition: color 0.15s; padding-bottom: 2px; border-bottom: 1px solid transparent; }
.masthead-nav a:hover, .masthead-nav a.nav-active { color: #1E1C19; border-bottom-color: #1E1C19; }
.nav-divider { color: #C8BFB0; font-weight: 300; }
.nav-user { color: #8C7E6A; display: flex; align-items: center; gap: 6px; }
.role-mark { font-size: 10px; padding: 2px 6px; border-radius: 2px; font-style: normal; letter-spacing: 0.05em; }
.role-mark.admin { background: #2C2A26; color: #F2EDE4; }
.role-mark.user  { background: #D6CFC4; color: #4A4030; }
.nav-logout { color: #8C7E6A !important; }

/* ── Page ── */
.page { max-width: 1100px; margin: 0 auto; padding: 32px 40px 60px; }
.page-heading { font-size: 22px; font-weight: 700; color: #1E1C19; margin: 0 0 28px; border-bottom: 1px solid #C8BFB0; padding-bottom: 12px; }

/* ── Filter ── */
.filter-section { margin-bottom: 28px; }
.status-strip { display: flex; gap: 0; border-bottom: 1px solid #C8BFB0; margin-bottom: 16px; }
.strip-btn { background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 18px; margin-bottom: -1px; font-family: system-ui, sans-serif; font-size: 13px; color: #8C7E6A; cursor: pointer; letter-spacing: 0.03em; transition: color 0.15s, border-color 0.15s; }
.strip-btn:hover { color: #1E1C19; }
.strip-active { color: #1E1C19 !important; border-bottom-color: #1E1C19 !important; }
.strip-count { margin-left: 4px; font-size: 11px; color: inherit; opacity: 0.6; }

.search-row { display: flex; gap: 10px; flex-wrap: wrap; }
.search-row select, .search-row input {
  border: 1px solid #C8BFB0; background: rgba(255,255,255,0.5);
  padding: 8px 12px; font-size: 13px; color: #2C2A26;
  border-radius: 2px; outline: none; font-family: system-ui, sans-serif;
  transition: border-color 0.15s;
}
.search-row select:focus, .search-row input:focus { border-color: #2C2A26; background: rgba(255,255,255,0.8); }
.search-row input { flex-grow: 1; min-width: 160px; }

/* ── Card Grid ── */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }

.item-card {
  background: rgba(255,255,255,0.55);
  border: 1px solid #D6CFC4;
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(4px);
}
.item-card:hover { box-shadow: 0 8px 32px rgba(44,42,38,0.1); transform: translateY(-3px); }
.item-card.claimed { border-color: #9FB8C0; background: rgba(220,232,236,0.35); }
.item-card.closed  { border-color: #C4A882; background: rgba(236,224,208,0.4); }
.item-card.deleted { opacity: 0.65; filter: grayscale(30%); }

.card-photo { position: relative; aspect-ratio: 4/3; overflow: hidden; background: #E8E2D8; }
.card-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.item-card:hover .card-photo img { transform: scale(1.03); }
.card-photo-empty { display: flex; align-items: center; justify-content: center; font-size: 52px; filter: grayscale(1) opacity(0.3); }
.photo-zoom { cursor: zoom-in; }

.card-status-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; }
.card-status-bar.active  { background: #8C8478; }
.card-status-bar.claimed { background: #6B6560; }
.card-status-bar.closed  { background: #A09888; }
.card-status-bar.deleted { background: #B0A898; }

.card-body { padding: 16px 18px 18px; display: flex; flex-direction: column; flex: 1; }

.card-meta-top { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }

/* ── Tags ── */
.tag { display: inline-block; font-family: system-ui, sans-serif; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 1px; font-weight: 600; }
.type-tag.lost  { background: #2C2A26; color: #E8E4DC; }
.type-tag.found { background: #6B6560; color: #E8E4DC; }
.status-tag.active  { background: #E8E4DC; color: #4A4640; border: 1px solid #C0B8AC; }
.status-tag.claimed { background: #D8D4CC; color: #3A3830; border: 1px solid #B8B0A4; }
.status-tag.closed  { background: #D0CCC4; color: #5A5650; border: 1px solid #B0A89C; }
.status-tag.deleted { background: #C8C4BC; color: #6A6660; border: 1px solid #A8A098; }

.card-title { margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #1E1C19; line-height: 1.3; font-family: 'Georgia', serif; }

.card-dl { margin: 0 0 8px; display: flex; flex-direction: column; gap: 3px; }
.card-dl > div { display: flex; gap: 8px; font-family: system-ui, sans-serif; font-size: 12px; }
.card-dl dt { color: #8C7E6A; min-width: 28px; flex-shrink: 0; }
.card-dl dd { margin: 0; color: #3A3530; }

.card-owner { font-family: system-ui, sans-serif; font-size: 11px; color: #A8998A; margin: 4px 0 12px; font-style: italic; }

.card-actions { margin-top: auto; padding-top: 12px; border-top: 1px solid #E0D8CC; display: flex; gap: 14px; }
.act-btn { background: none; border: none; padding: 0; font-family: system-ui, sans-serif; font-size: 11px; letter-spacing: 0.05em; color: #6B5F4F; cursor: pointer; transition: color 0.15s; }
.act-btn:hover { color: #1E1C19; }
.act-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.act-del { color: #8C4A4A; }
.act-del:hover { color: #5C1E1E; }

/* ── Pager ── */
.pager { display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 40px; padding-top: 24px; border-top: 1px solid #C8BFB0; }
.pager-btn { background: none; border: none; font-family: system-ui, sans-serif; font-size: 13px; color: #6B5F4F; cursor: pointer; letter-spacing: 0.03em; transition: color 0.15s; }
.pager-btn:hover { color: #1E1C19; }
.pager-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.pager-info { font-family: system-ui, sans-serif; font-size: 12px; color: #8C7E6A; letter-spacing: 0.05em; }
.empty-hint { text-align: center; color: #8C7E6A; font-family: system-ui, sans-serif; font-size: 14px; margin-top: 60px; }

/* ── Form ── */
.page-form { max-width: 560px; }
.editorial-form { display: flex; flex-direction: column; gap: 0; }
.form-row { display: grid; grid-template-columns: 80px 1fr; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #E0D8CC; }
.form-row-col { grid-template-columns: 1fr; align-items: flex-start; gap: 8px; }
.form-row label { font-family: system-ui, sans-serif; font-size: 12px; letter-spacing: 0.05em; color: #8C7E6A; text-transform: uppercase; }
.form-row input, .form-row select, .form-row textarea {
  background: transparent; border: none; border-bottom: 1px solid #C8BFB0;
  padding: 6px 0; font-size: 14px; color: #1E1C19; outline: none;
  font-family: 'Georgia', serif; width: 100%; transition: border-color 0.15s;
}
.form-row input:focus, .form-row select:focus, .form-row textarea:focus { border-bottom-color: #1E1C19; }
.form-row textarea { resize: vertical; min-height: 80px; }

.file-area { display: flex; flex-direction: column; gap: 8px; }
.file-area input[type="file"] { display: none; }
.file-label { display: inline-block; font-family: system-ui, sans-serif; font-size: 12px; letter-spacing: 0.05em; color: #6B5F4F; cursor: pointer; border-bottom: 1px solid #C8BFB0; padding-bottom: 4px; text-transform: uppercase; transition: color 0.15s; }
.file-label:hover { color: #1E1C19; border-bottom-color: #1E1C19; }
.preview-thumb { max-width: 120px; max-height: 80px; object-fit: cover; border-radius: 2px; border: 1px solid #D6CFC4; }

.form-submit { display: flex; gap: 16px; align-items: center; padding-top: 24px; }
.submit-btn { background: #1E1C19; color: #F2EDE4; border: none; padding: 11px 28px; font-family: system-ui, sans-serif; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; border-radius: 2px; transition: background 0.15s; }
.submit-btn:hover { background: #3A3530; }
.submit-danger { background: #7A3030; }
.submit-danger:hover { background: #5C1E1E; }
.cancel-btn { background: none; border: none; font-family: system-ui, sans-serif; font-size: 13px; color: #8C7E6A; cursor: pointer; letter-spacing: 0.03em; transition: color 0.15s; }
.cancel-btn:hover { color: #1E1C19; }

/* ── Modal Sheet ── */
.modal-backdrop { position: fixed; inset: 0; background: rgba(30,28,25,0.6); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-sheet {
  background: #F5F0E8;
  border-radius: 3px;
  width: 100%; max-width: 580px;
  max-height: 90vh; overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.modal-compact { max-width: 420px; }

.sheet-close { position: absolute; top: 16px; right: 18px; background: none; border: none; font-size: 16px; color: #8C7E6A; cursor: pointer; z-index: 1; line-height: 1; transition: color 0.15s; }
.sheet-close:hover { color: #1E1C19; }

.sheet-photo { width: 100%; aspect-ratio: 16/7; overflow: hidden; background: #E8E2D8; cursor: zoom-in; position: relative; }
.sheet-photo img { width: 100%; height: 100%; object-fit: cover; }
.sheet-photo-empty { display: flex; align-items: center; justify-content: center; font-size: 64px; cursor: default; filter: grayscale(1) opacity(0.3); }
.sheet-zoom-hint { position: absolute; bottom: 8px; right: 10px; font-family: system-ui, sans-serif; font-size: 10px; letter-spacing: 0.08em; background: rgba(30,28,25,0.5); color: #F2EDE4; padding: 2px 8px; border-radius: 1px; }

.sheet-body { padding: 28px 32px 32px; }
.sheet-tags { display: flex; gap: 6px; margin-bottom: 12px; }
.sheet-title { margin: 0 0 6px; font-size: 22px; font-weight: 700; color: #1E1C19; font-family: 'Georgia', serif; padding-right: 32px; }
.sheet-subtitle { color: #6B5F4F; font-family: system-ui, sans-serif; font-size: 14px; margin: 0 0 24px; }

.sheet-dl { display: flex; flex-direction: column; gap: 0; margin-bottom: 24px; }
.sheet-dl > div { display: grid; grid-template-columns: 56px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid #E0D8CC; font-family: system-ui, sans-serif; font-size: 13px; }
.sheet-dl dt { color: #8C7E6A; letter-spacing: 0.03em; }
.sheet-dl dd { margin: 0; color: #2C2A26; }

.claim-section { margin-top: 28px; padding-top: 24px; border-top: 1px solid #C8BFB0; }
.claim-heading { margin: 0 0 20px; font-size: 15px; font-weight: 600; color: #1E1C19; letter-spacing: 0.03em; font-family: system-ui, sans-serif; }

/* ── Status Choice ── */
.status-choice { display: flex; flex-direction: column; gap: 8px; margin: 20px 0 24px; }
.choice-btn { background: rgba(255,255,255,0.6); border: 1px solid #D6CFC4; padding: 12px 16px; text-align: left; font-family: system-ui, sans-serif; font-size: 13px; color: #2C2A26; cursor: pointer; border-radius: 2px; display: flex; align-items: center; gap: 10px; transition: background 0.15s; }
.choice-btn:hover:not(:disabled) { background: rgba(255,255,255,0.9); }
.choice-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.choice-btn.chosen { border-color: #2C2A26; background: rgba(255,255,255,0.9); }
.choice-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.choice-dot.active  { background: #8C8478; }
.choice-dot.claimed { background: #6B6560; }
.choice-dot.closed  { background: #A09888; }

/* ── Lightbox ── */
.lightbox { position: fixed; inset: 0; background: rgba(10,8,6,0.92); display: flex; align-items: center; justify-content: center; z-index: 200; cursor: zoom-out; }
.lightbox img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 2px; }
.lightbox-close { position: fixed; top: 20px; right: 24px; background: none; border: none; color: rgba(255,255,255,0.7); font-size: 22px; cursor: pointer; transition: color 0.15s; }
.lightbox-close:hover { color: #fff; }

/* ── Toast ── */
.toast-stack { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; z-index: 999; pointer-events: none; }
.toast { padding: 10px 20px; font-family: system-ui, sans-serif; font-size: 13px; letter-spacing: 0.03em; border-radius: 2px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); min-width: 200px; text-align: center; }
.toast.success { background: #1E1C19; color: #F2EDE4; }
.toast.error   { background: #7A3030; color: #F2EDE4; }
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(12px); }
</style>
