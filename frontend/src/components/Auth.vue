<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <p class="auth-sup">校園</p>
        <h1 class="auth-title">失物招領</h1>
        <div class="auth-rule"></div>
      </div>

      <div class="auth-tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登入</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">註冊</button>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <div class="auth-field">
          <label>帳號</label>
          <input v-model="form.username" type="text" placeholder="username" required autofocus />
        </div>
        <div class="auth-field">
          <label>密碼</label>
          <input v-model="form.password" type="password" placeholder="password" required />
        </div>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <button type="submit" class="auth-submit" :disabled="loading">
          {{ loading ? '處理中⋯' : (mode === 'login' ? '登入' : '註冊') }}
        </button>
      </form>

      <p class="auth-hint">預設管理員　admin / admin123</p>
    </div>
  </div>
</template>

<script>
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
export default {
  emits: ['logged-in'],
  data() { return { mode: 'login', form: { username: '', password: '' }, error: '', loading: false }; },
  methods: {
    async submit() {
      this.error = ''; this.loading = true;
      try {
        const endpoint = this.mode === 'login' ? '/auth/login' : '/auth/register';
        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form),
        });
        const data = await res.json();
        if (!res.ok) { this.error = data.error; return; }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.$emit('logged-in', data.user);
      } catch { this.error = '連線失敗，請確認後端是否啟動'; }
      finally { this.loading = false; }
    },
  },
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 380px;
  background: rgba(255,255,255,0.5);
  border: 1px solid #D6CFC4;
  border-radius: 3px;
  padding: 40px 36px;
  backdrop-filter: blur(6px);
}

.auth-header { text-align: center; margin-bottom: 28px; }
.auth-sup { font-family: system-ui, sans-serif; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #8C7E6A; margin: 0 0 6px; }
.auth-title { font-family: 'Georgia', serif; font-size: 32px; font-weight: 700; color: #1E1C19; margin: 0 0 20px; letter-spacing: -0.02em; }
.auth-rule { border: none; border-top: 1px solid #C8BFB0; }

.auth-tabs { display: flex; margin-bottom: 28px; }
.auth-tabs button { flex: 1; background: none; border: none; border-bottom: 1px solid #C8BFB0; padding: 10px; font-family: system-ui, sans-serif; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #8C7E6A; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
.auth-tabs button.active { color: #1E1C19; border-bottom-color: #1E1C19; }

.auth-form { display: flex; flex-direction: column; gap: 0; }
.auth-field { padding: 14px 0; border-bottom: 1px solid #E0D8CC; display: flex; flex-direction: column; gap: 5px; }
.auth-field label { font-family: system-ui, sans-serif; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #8C7E6A; }
.auth-field input { background: none; border: none; outline: none; font-family: 'Georgia', serif; font-size: 15px; color: #1E1C19; padding: 2px 0; }
.auth-field input::placeholder { color: #C0B8AC; }

.auth-error { font-family: system-ui, sans-serif; font-size: 12px; color: #7A3030; margin: 12px 0 0; }

.auth-submit { margin-top: 28px; background: #1E1C19; color: #F2EDE4; border: none; padding: 13px; font-family: system-ui, sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; border-radius: 2px; transition: background 0.15s; }
.auth-submit:hover { background: #3A3530; }
.auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.auth-hint { text-align: center; font-family: system-ui, sans-serif; font-size: 11px; color: #A8998A; margin-top: 20px; letter-spacing: 0.03em; }
</style>
