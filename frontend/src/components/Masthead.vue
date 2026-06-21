<template>
  <header class="masthead">
    <div class="masthead-inner">
      <div class="masthead-title">
        <span class="masthead-sub">校園</span>
        <h1>失物招領</h1>
      </div>
      <nav class="masthead-nav">
        <a :class="{ 'nav-active': currentTab === 'list' }" @click="$emit('tab', 'list')">列表</a>
        <a :class="{ 'nav-active': currentTab === 'post' }" @click="$emit('tab', 'post')">發布</a>
        <a :class="{ 'nav-active': currentTab === 'trash' }" @click="$emit('tab', 'trash')">
          垃圾桶<sup v-if="trashCount">{{ trashCount }}</sup>
        </a>
        <a v-if="currentUser.role === 'admin'"
           :class="{ 'nav-active': currentTab === 'admin' }"
           @click="$emit('tab', 'admin')">使用者</a>
        <span class="nav-divider">|</span>
        <span class="nav-user">
          <em class="role-mark" :class="currentUser.role">
            {{ currentUser.role === 'admin' ? 'Admin' : 'User' }}
          </em>
          {{ currentUser.username }}
        </span>
        <a class="nav-logout" @click="$emit('logout')">登出</a>
      </nav>
    </div>
    <div class="masthead-rule"></div>
  </header>
</template>

<script>
export default {
  props: {
    currentUser: { type: Object, required: true },
    currentTab:  { type: String, required: true },
    trashCount:  { type: Number, default: 0 },
  },
  emits: ['tab', 'logout'],
}
</script>
