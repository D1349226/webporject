<template>
  <div>
    <h2>👥 使用者管理</h2>
    <p class="hint">共 {{ users.length }} 位使用者</p>

    <table class="user-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>帳號</th>
          <th>角色</th>
          <th>註冊時間</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id" :class="{ self: u.id === currentUser.id }">
          <td>{{ u.id }}</td>
          <td>
            {{ u.username }}
            <span v-if="u.id === currentUser.id" class="self-tag">（我）</span>
          </td>
          <td>
            <span class="role-pill" :class="u.role">{{ u.role === 'admin' ? '管理員' : '一般使用者' }}</span>
          </td>
          <td>{{ formatDate(u.created_at) }}</td>
          <td>
            <div class="action-btns" v-if="u.id !== currentUser.id">
              <button
                v-if="u.role === 'user'"
                class="btn-promote"
                @click="changeRole(u, 'admin')"
              >升為管理員</button>
              <button
                v-else
                class="btn-demote"
                @click="changeRole(u, 'user')"
              >降為一般使用者</button>
              <button class="btn-del" @click="confirmDelete(u)">刪除</button>
            </div>
            <span v-else class="no-action">—</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 刪除確認 -->
    <div v-if="deletingUser" class="overlay" @click.self="deletingUser = null">
      <div class="confirm-box">
        <h3>確定刪除使用者？</h3>
        <p>「{{ deletingUser.username }}」的帳號將被永久刪除。</p>
        <div class="btn-row">
          <button class="btn-del" @click="deleteUser">確定刪除</button>
          <button class="btn-cancel" @click="deletingUser = null">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default {
  props: { currentUser: Object },
  emits: ['toast'],
  data() {
    return { users: [], deletingUser: null };
  },
  mounted() { this.fetchUsers(); },
  methods: {
    async fetchUsers() {
      try {
        const res = await fetch(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        this.users = await res.json();
      } catch { this.$emit('toast', '無法載入使用者列表', 'error'); }
    },
    async changeRole(user, role) {
      const label = role === 'admin' ? '管理員' : '一般使用者';
      try {
        const res = await fetch(`${API_BASE}/users/${user.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ role })
        });
        const data = await res.json();
        if (res.ok) { this.$emit('toast', `已將 ${user.username} 設為${label}`); this.fetchUsers(); }
        else this.$emit('toast', data.error, 'error');
      } catch { this.$emit('toast', '操作失敗', 'error'); }
    },
    confirmDelete(user) { this.deletingUser = user; },
    async deleteUser() {
      try {
        const res = await fetch(`${API_BASE}/users/${this.deletingUser.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (res.ok) { this.$emit('toast', '使用者已刪除'); this.deletingUser = null; this.fetchUsers(); }
        else this.$emit('toast', data.error, 'error');
      } catch { this.$emit('toast', '操作失敗', 'error'); }
    },
    formatDate(dt) {
      if (!dt) return '—';
      return new Date(dt).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  }
};
</script>

<style scoped>
h2 { margin-bottom: 4px; }
.hint { color: #888; font-size: 13px; margin-bottom: 16px; }

.user-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.user-table th { background: #f5f5f5; padding: 10px 12px; text-align: left; border-bottom: 2px solid #ddd; }
.user-table td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: middle; }
.user-table tr.self { background: #f0fff7; }

.role-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
.role-pill.admin { background: #fef3e8; color: #e67e22; border: 1px solid #f0b27a; }
.role-pill.user  { background: #eaf3fb; color: #2980b9; border: 1px solid #aed6f1; }

.self-tag { font-size: 11px; color: #27ae60; margin-left: 4px; }

.action-btns { display: flex; gap: 6px; }
button { padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
.btn-promote { background: #e8f8f0; color: #27ae60; border: 1px solid #a9dfbf; }
.btn-demote  { background: #fef9e7; color: #d4ac0d; border: 1px solid #f9e79f; }
.btn-del     { background: #fdf0f0; color: #e74c3c; border: 1px solid #f5b7b1; }
.btn-cancel  { background: #f5f5f5; color: #555; }
.no-action   { color: #ccc; }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 200; }
.confirm-box { background: #fff; padding: 28px; border-radius: 10px; max-width: 360px; width: 100%; }
.confirm-box h3 { margin: 0 0 8px; }
.confirm-box p { color: #555; margin-bottom: 20px; }
.btn-row { display: flex; gap: 10px; }
.btn-row button { flex: 1; padding: 10px; }
</style>
