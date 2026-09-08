<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <button class="brand" type="button" @click="router.push('/knowledge')">
        <span class="brand-mark">深知</span>
        <span><strong>深知</strong><small>ShenZhi · Research OS</small></span>
      </button>
      <nav class="side-nav" aria-label="知识底座导航">
        <RouterLink to="/knowledge" class="nav-item home-item" :class="{ active: section === 'knowledge' }"><el-icon><Search /></el-icon><span>综合检索</span></RouterLink>
        <p class="nav-caption">科研资源</p>
        <RouterLink to="/resources/papers" class="nav-item" :class="{ active: section === 'paper' }"><el-icon><Document /></el-icon><span>论文</span></RouterLink>
        <RouterLink to="/resources/patents" class="nav-item" :class="{ active: section === 'patent' }"><el-icon><Stamp /></el-icon><span>专利</span></RouterLink>
        <RouterLink to="/resources/scholars" class="nav-item" :class="{ active: section === 'scholar' }"><el-icon><User /></el-icon><span>学者</span></RouterLink>
        <RouterLink to="/resources/projects" class="nav-item" :class="{ active: section === 'project' }"><el-icon><Folder /></el-icon><span>项目</span></RouterLink>
        <RouterLink to="/resources/funds" class="nav-item" :class="{ active: section === 'fund' }"><el-icon><Coin /></el-icon><span>基金</span></RouterLink>
        <p class="nav-caption nav-caption-spaced">关系探索</p>
        <RouterLink to="/kg" class="nav-item" :class="{ active: section === 'graph' }"><el-icon><Share /></el-icon><span>论文关系图谱</span></RouterLink>
        <RouterLink v-if="authStore.isLoggedIn" to="/admin" class="nav-item" :class="{ active: section === 'admin' }"><el-icon><Setting /></el-icon><span>内容管理</span></RouterLink>
      </nav>
    </aside>
    <section class="app-content"><HeaderBar /><AppMain /></section>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Coin, Document, Folder, Search, Setting, Share, Stamp, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/store/modules/auth'
import HeaderBar from './components/HeaderBar.vue'
import AppMain from './components/AppMain.vue'
const route = useRoute(); const router = useRouter(); const authStore = useAuthStore()
const section = computed(() => String(route.meta.section || ''))
</script>
<style scoped>
.app-shell{width:100%;height:100dvh;min-height:0;display:grid;grid-template-columns:248px minmax(0,1fr);overflow:hidden;background:var(--sz-bg);color:var(--sz-text)}
.app-sidebar{height:100%;display:flex;flex-direction:column;min-height:0;padding:20px 16px;overflow:hidden;background:var(--sz-sidebar);border-right:1px solid var(--sz-line)}
.brand{display:flex;align-items:center;gap:11px;width:100%;padding:4px 8px 24px;border:0;background:transparent;text-align:left;cursor:pointer;color:var(--sz-text)}
.brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#fff;box-shadow:0 5px 18px rgba(0,47,167,.1);color:var(--sz-primary);font-family:serif;font-weight:700}
.brand strong,.brand small{display:block}.brand strong{font-size:19px}.brand small{margin-top:3px;color:var(--sz-text-muted);font-size:10px}
.side-nav{display:grid;gap:5px}.nav-caption{margin:8px 10px 7px;color:#9aa4b5;font-size:11px;letter-spacing:.08em}.nav-caption-spaced{margin-top:22px}
.home-item{margin-bottom:7px;border:1px solid #dbe3f4;background:#fff}
.nav-item{display:flex;align-items:center;gap:12px;min-height:44px;padding:0 13px;border-radius:12px;color:#4d596d;font-size:14px;font-weight:500;text-decoration:none;transition:.18s ease}
.nav-item:hover{background:rgba(255,255,255,.68);color:var(--sz-primary)}.nav-item.active{background:var(--sz-primary);color:#fff;box-shadow:0 8px 20px rgba(0,47,167,.18)}
.app-content{height:100%;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
@media(max-width:980px){.app-shell{grid-template-columns:76px minmax(0,1fr)}.app-sidebar{padding:16px 10px}.brand{padding-inline:7px}.brand>span:last-child,.nav-caption,.nav-item span{display:none}.nav-item{justify-content:center;padding:0}}
</style>
