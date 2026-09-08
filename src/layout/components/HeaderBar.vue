<template>
  <header class="topbar">
    <div class="crumbs"><span class="section-name">知识底座</span><el-icon><ArrowRight /></el-icon><strong>{{ String(route.meta.title || '知识底座') }}</strong></div>
    <div class="topbar-actions">
      <button class="global-search" type="button" @click="router.push('/knowledge/papers')"><el-icon><Search /></el-icon><span>检索论文、作者或会议</span><kbd>⌘ K</kbd></button>
      <template v-if="authStore.isLoggedIn">
        <el-dropdown @command="handleCommand"><button class="user-chip" type="button"><span class="avatar">{{ userInitial }}</span><span>{{ authStore.user?.username || '研究者' }}</span><el-icon><ArrowDown /></el-icon></button><template #dropdown><el-dropdown-menu><el-dropdown-item command="logout">退出登录</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      </template>
      <button v-else class="login-button" type="button" @click="router.push('/login')">登录</button>
    </div>
  </header>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, ArrowRight, Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/store/modules/auth'
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const userInitial = computed(() => (authStore.user?.username || '研').slice(0, 1))
function handleCommand(command: string) { if (command === 'logout') { authStore.logout(); router.push('/login') } }
</script>
<style scoped>
.topbar{height:64px;padding:0 28px;display:flex;align-items:center;justify-content:space-between;gap:24px;background:rgba(255,255,255,.94);border-bottom:1px solid var(--sz-line);backdrop-filter:blur(12px)}
.crumbs,.topbar-actions,.global-search,.user-chip{display:flex;align-items:center}.crumbs{gap:9px;min-width:0;color:var(--sz-text-muted);font-size:14px}.crumbs strong{color:var(--sz-text);font-weight:650;white-space:nowrap}.section-name{white-space:nowrap}.topbar-actions{gap:12px}
.global-search{width:300px;gap:10px;padding:9px 12px;color:#7b8496;background:var(--sz-bg);border:1px solid transparent;border-radius:10px;cursor:pointer;text-align:left}.global-search:hover{border-color:#bdc9e6;background:#fff}.global-search span{flex:1}kbd{padding:2px 6px;font:11px var(--font-sans);color:#8d96a7;background:#fff;border:1px solid var(--sz-line);border-radius:5px}
.user-chip{gap:8px;padding:5px 8px 5px 5px;color:var(--sz-text);background:transparent;border:0;border-radius:9px;cursor:pointer}.user-chip:hover{background:var(--sz-bg)}.avatar{width:30px;height:30px;display:grid;place-items:center;color:var(--sz-primary);background:var(--sz-primary-soft);border-radius:9px;font-weight:700}.login-button{padding:8px 17px;color:#fff;background:var(--sz-primary);border:0;border-radius:9px;cursor:pointer}
@media(max-width:900px){.global-search{width:42px}.global-search span,.global-search kbd,.section-name,.crumbs .el-icon{display:none}.topbar{padding:0 16px}}
</style>
