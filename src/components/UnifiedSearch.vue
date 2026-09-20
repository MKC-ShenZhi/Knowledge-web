<template>
  <section class="unified-search" :class="{ compact }">
    <form class="search-box" @submit.prevent="runSearch">
      <div class="search-input-wrap"><el-icon><Search /></el-icon><textarea v-model="query" :placeholder="placeholder" rows="2" @keydown.enter.exact.prevent="runSearch" /></div>
      <div class="search-actions"><span>{{ scope === 'all' ? '跨类型知识检索' : `${RESOURCE_LABELS[scope]}检索` }}</span><button type="submit" :disabled="loading || !query.trim()">{{ loading ? '检索中…' : '开始检索' }} <el-icon><Right /></el-icon></button></div>
    </form>

    <div v-if="error" class="search-state error">{{ error }}</div>
    <template v-else-if="searched && !loading">
      <div v-if="scope === 'all'" class="result-tabs" role="tablist" aria-label="资源类别">
        <button type="button" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部 <em>{{ totalCount }}</em></button>
        <button v-for="kind in resourceOrder" :key="kind" type="button" :class="{ active: activeTab === kind }" @click="activeTab = kind">{{ RESOURCE_LABELS[kind] }} <em>{{ groups[kind].length }}</em></button>
      </div>
      <div v-if="scope === 'all'" class="search-results">
        <section v-for="kind in visibleKinds" :key="kind" class="result-group">
          <header><div><span class="type-mark">{{ RESOURCE_LABELS[kind].slice(0,1) }}</span><h2>{{ RESOURCE_LABELS[kind] }}</h2><em>{{ groups[kind].length }}</em></div><button type="button" @click="openCategory(kind)">查看全部</button></header>
          <div v-if="groups[kind].length" class="result-grid"><article v-for="item in groups[kind]" :key="item.id" class="result-card" @click="openItem(item)"><h3>{{ item.title }}</h3><p>{{ item.summary }}</p><div><span v-for="tag in item.meta.slice(0,3)" :key="tag">{{ tag }}</span></div></article></div>
          <p v-else class="empty-group">暂未找到相关{{ RESOURCE_LABELS[kind] }}</p>
        </section>
      </div>
      <div v-else class="scoped-layout">
        <aside class="filter-panel" aria-label="结果筛选">
          <div class="filter-head"><strong>筛选条件</strong><button v-if="hasFilters" type="button" @click="clearFilters">清除</button></div>
          <section v-if="yearOptions.length"><h3>年份</h3><label v-for="year in yearOptions" :key="year"><input v-model="selectedYears" type="checkbox" :value="year" />{{ year }}</label></section>
          <section v-if="facetTags.length"><h3>{{ scope === 'scholar' ? '研究方向' : scope === 'paper' ? '会议与作者' : '主题标签' }}</h3><label v-for="tag in facetTags" :key="tag"><input v-model="selectedTags" type="checkbox" :value="tag" />{{ tag }}</label></section>
        </aside>
        <section class="result-group scoped-group">
          <header><div><span class="type-mark">{{ RESOURCE_LABELS[scope].slice(0,1) }}</span><h2>{{ RESOURCE_LABELS[scope] }}结果</h2><em>{{ filteredScopedResults.length }}</em></div><label class="sort-control">排序<select v-model="sortBy"><option value="relevance">相关度</option><option value="newest">最新年份</option><option value="title">标题</option></select></label></header>
          <div v-if="filteredScopedResults.length" class="result-list"><article v-for="item in filteredScopedResults" :key="item.id" class="result-card" @click="openItem(item)"><h3>{{ item.title }}</h3><p>{{ item.summary }}</p><div><span v-for="tag in item.meta" :key="tag">{{ tag }}</span></div></article></div>
          <p v-else class="empty-group">没有符合当前筛选条件的结果。</p>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Right, Search } from '@element-plus/icons-vue'
import { RESOURCE_LABELS, searchAllResources, searchResource } from '@/services/unifiedSearch'
import type { ResourceKind, ResourceSearchGroups, ResourceSearchItem } from '@/types/search'

const props = withDefaults(defineProps<{ scope?: ResourceKind | 'all'; initialQuery?: string; compact?: boolean }>(), { scope: 'all', initialQuery: '', compact: false })
const emit = defineEmits<{ searchComplete: [query: string] }>()
const router = useRouter(); const route = useRoute(); const scope = computed(() => props.scope)
const query = ref(props.initialQuery || String(route.query.q || '')); const loading = ref(false); const searched = ref(false); const error = ref('')
const groups = reactive<ResourceSearchGroups>({ paper: [], patent: [], scholar: [], projectFund: [] }); const scopedResults = ref<ResourceSearchItem[]>([])
const resourceOrder: ResourceKind[] = ['paper', 'patent', 'scholar', 'projectFund']; const activeTab = ref<ResourceKind | 'all'>('all')
const selectedTags = ref<string[]>([]); const selectedYears = ref<string[]>([]); const sortBy = ref<'relevance' | 'newest' | 'title'>('relevance')
const placeholder = computed(() => props.scope === 'all' ? '输入研究主题、技术名称、学者或关键词，发现相关论文、专利、学者与项目基金' : `输入关键词检索${RESOURCE_LABELS[props.scope]}`)
const totalCount = computed(() => resourceOrder.reduce((total, kind) => total + groups[kind].length, 0)); const visibleKinds = computed(() => activeTab.value === 'all' ? resourceOrder : [activeTab.value])
const yearOptions = computed(() => [...new Set(scopedResults.value.map(item => String(item.year || item.meta.find(meta => /^20\d{2}$/.test(meta)) || '')).filter(Boolean))].sort((a, b) => Number(b) - Number(a)))
const facetTags = computed(() => [...new Set(scopedResults.value.flatMap(item => item.meta).filter(tag => !/^20\d{2}$/.test(tag)))].slice(0, 12)); const hasFilters = computed(() => selectedTags.value.length > 0 || selectedYears.value.length > 0)
const filteredScopedResults = computed(() => {
  const filtered = scopedResults.value.filter(item => { const year = String(item.year || item.meta.find(meta => /^20\d{2}$/.test(meta)) || ''); return (!selectedYears.value.length || selectedYears.value.includes(year)) && (!selectedTags.value.length || selectedTags.value.every(tag => item.meta.includes(tag))) })
  return [...filtered].sort((a, b) => sortBy.value === 'newest' ? Number(b.year || 0) - Number(a.year || 0) : sortBy.value === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : Number(b.score || 0) - Number(a.score || 0))
})
async function runSearch() { const text = query.value.trim(); if (!text) return; loading.value = true; error.value = ''; searched.value = true; activeTab.value = 'all'; clearFilters(); try { if (props.scope === 'all') Object.assign(groups, await searchAllResources(text)); else scopedResults.value = await searchResource(text, props.scope); await router.replace({ query: { ...route.query, q: text } }); emit('searchComplete', text) } catch (e) { error.value = e instanceof Error ? e.message : '检索失败，请稍后重试' } finally { loading.value = false } }
function clearFilters() { selectedTags.value = []; selectedYears.value = [] }
function openCategory(kind: ResourceKind) { router.push({ name: `resource-${kind}`, query: { q: query.value.trim() } }) }
function openItem(item: ResourceSearchItem) { if (item.type === 'paper' && item.paperId) router.push({ name: 'paper-graph', params: { paperId: item.paperId }, query: { title: item.title } }); else openCategory(item.type) }
watch(() => props.initialQuery, value => { if (value) query.value = value }); watch(() => route.query.q, value => { const next = String(value || ''); if (next && next !== query.value) { query.value = next; void runSearch() } }); if (query.value.trim()) void runSearch()
</script>

<style scoped>
.unified-search{width:100%}.search-box{padding:18px;background:#fff;border:1px solid #aebdf0;border-radius:18px;box-shadow:0 18px 48px rgba(42,67,137,.13)}.search-input-wrap{display:flex;align-items:flex-start;gap:13px;min-height:92px;padding:7px}.search-input-wrap>.el-icon{margin-top:5px;color:var(--sz-primary);font-size:24px}.search-input-wrap textarea{width:100%;min-height:72px;resize:none;border:0;outline:0;color:var(--sz-navy);font:inherit;font-size:18px;line-height:1.6;background:transparent}.search-input-wrap textarea::placeholder{color:#929db2}.search-actions{display:flex;align-items:center;justify-content:space-between;padding-top:13px;border-top:1px solid var(--sz-line)}.search-actions>span{color:var(--sz-text-muted);font-size:12px}.search-actions button{height:42px;display:inline-flex;align-items:center;gap:8px;padding:0 20px;color:#fff;background:var(--sz-primary);border:0;border-radius:11px;font-weight:700;cursor:pointer}.search-actions button:disabled{opacity:.5;cursor:not-allowed}.result-tabs{display:flex;gap:7px;margin-top:22px;padding-bottom:2px;overflow:auto}.result-tabs button{flex:0 0 auto;padding:9px 13px;color:var(--sz-text-secondary);background:#fff;border:1px solid var(--sz-line);border-radius:9px;cursor:pointer}.result-tabs button.active{color:var(--sz-primary);border-color:#9aaee4;background:var(--sz-primary-soft);font-weight:700}.result-tabs em{margin-left:4px;color:inherit;font-size:11px;font-style:normal}.search-results{display:grid;gap:18px;margin-top:16px}.result-group{padding:22px;background:#fff;border:1px solid var(--sz-line);border-radius:16px}.result-group>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.result-group>header>div{display:flex;align-items:center;gap:9px}.type-mark{width:30px;height:30px;display:grid;place-items:center;color:#fff;background:var(--sz-primary);border-radius:9px;font-size:13px;font-weight:800}.result-group h2{margin:0;color:var(--sz-navy);font-size:19px}.result-group header em{color:var(--sz-text-muted);font-style:normal}.result-group header>button,.filter-head button{color:var(--sz-primary);background:none;border:0;cursor:pointer}.result-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.result-list{display:grid;gap:12px}.result-card{min-width:0;padding:16px;background:#f8faff;border:1px solid #e5eaf5;border-radius:12px;cursor:pointer;transition:.18s}.result-card:hover{transform:translateY(-2px);border-color:#b9c7ea;box-shadow:0 8px 22px rgba(31,47,83,.08)}.result-card h3{margin:0;color:var(--sz-navy);font-size:15px;line-height:1.45}.result-card p{display:-webkit-box;margin:9px 0;color:var(--sz-text-secondary);font-size:12px;line-height:1.65;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.result-card>div{display:flex;flex-wrap:wrap;gap:6px}.result-card>div span{padding:3px 7px;color:#536887;background:#edf2fb;border-radius:5px;font-size:10px}.empty-group,.search-state{margin:0;padding:18px;color:var(--sz-text-muted);text-align:center}.search-state.error{color:var(--sz-danger)}.scoped-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;margin-top:24px}.filter-panel{height:max-content;padding:18px;background:#fff;border:1px solid var(--sz-line);border-radius:14px}.filter-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:13px;border-bottom:1px solid var(--sz-line);color:var(--sz-navy)}.filter-panel section{padding-top:15px}.filter-panel h3{margin:0 0 9px;color:var(--sz-text-secondary);font-size:12px}.filter-panel label{display:flex;align-items:center;gap:8px;padding:6px 0;color:#536074;font-size:13px;cursor:pointer}.filter-panel input{accent-color:var(--sz-primary)}.scoped-group{padding:0;border:0;background:transparent}.scoped-group .result-card{background:#fff;padding:20px}.scoped-group .result-card p{-webkit-line-clamp:3}.sort-control{display:flex;align-items:center;gap:7px;color:var(--sz-text-muted);font-size:12px}.sort-control select{padding:7px 9px;color:var(--sz-text);background:#fff;border:1px solid var(--sz-line);border-radius:7px;outline:0}.compact .search-input-wrap{min-height:64px}.compact .search-input-wrap textarea{min-height:48px}@media(max-width:900px){.result-grid{grid-template-columns:1fr}.scoped-layout{grid-template-columns:1fr}.filter-panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}.filter-head{grid-column:1/-1}.filter-panel section{min-width:0}}@media(max-width:600px){.search-input-wrap textarea{font-size:15px}.search-actions>span{display:none}.search-actions{justify-content:flex-end}.filter-panel{grid-template-columns:1fr}.filter-head{grid-column:auto}}
</style>
