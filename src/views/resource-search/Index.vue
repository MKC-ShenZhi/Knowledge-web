<template>
  <div class="page-shell resource-page">
    <header><p class="page-eyebrow">{{ config.english }}</p><h1>{{ config.title }}</h1><p>{{ config.description }}</p></header>
    <UnifiedSearch :key="kind" :scope="kind" compact />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import UnifiedSearch from '@/components/UnifiedSearch.vue'
import type { ResourceKind } from '@/types/search'
const route=useRoute(); const kind=computed(()=>String(route.meta.resourceType||'paper') as ResourceKind)
const configs={paper:{english:'PAPER SEARCH',title:'论文检索',description:'检索论文题名、摘要、作者、关键词和会议，选择结果进入关系图谱。'},patent:{english:'PATENT SEARCH',title:'专利检索',description:'围绕技术主题、发明名称和应用方向发现相关专利成果。'},scholar:{english:'SCHOLAR SEARCH',title:'学者检索',description:'按照研究主题、姓名和研究方向发现相关学者与合作线索。'},projectFund:{english:'PROJECT & FUND SEARCH',title:'项目基金检索',description:'统一检索科研项目、基金计划、资助方向、关键技术与合作任务。'}} as const
const config=computed(()=>configs[kind.value])
</script>
<style scoped>.resource-page{display:flex;flex-direction:column;gap:24px;max-width:1320px}.resource-page header{padding:18px 2px}.resource-page h1{margin:0;color:var(--sz-navy);font-size:38px;letter-spacing:-.04em}.resource-page header>p:last-child{margin:12px 0 0;color:var(--sz-text-secondary)}</style>
