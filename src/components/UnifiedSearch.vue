<template>
  <section class="unified-search" :class="{ compact }">
    <form class="search-box" @submit.prevent="runSearch">
      <div class="search-input-wrap">
        <el-icon><Search /></el-icon>
        <textarea v-model="query" :placeholder="placeholder" rows="2" @keydown.enter.exact.prevent="runSearch" />
      </div>
      <div class="search-actions">
        <span>{{ scope === 'all' ? '跨类型知识检索' : `${RESOURCE_LABELS[scope]}检索` }}</span>
        <button type="submit" :disabled="loading || !query.trim()">{{ loading ? '检索中…' : '开始检索' }} <el-icon><Right /></el-icon></button>
      </div>
    </form>

    <div v-if="error" class="search-state error">{{ error }}</div>
    <div v-else-if="searched && !loading" class="search-results">
      <template v-if="scope === 'all'">
        <section v-for="kind in resourceOrder" :key="kind" class="result-group">
          <header><div><span class="type-mark">{{ RESOURCE_LABELS[kind].slice(0,1) }}</span><h2>{{ RESOURCE_LABELS[kind] }}</h2><em>{{ groups[kind].length }}</em></div><button @click="openCategory(kind)">查看全部</button></header>
          <div v-if="groups[kind].length" class="result-grid">
            <article v-for="item in groups[kind]" :key="item.id" class="result-card" @click="openItem(item)">
              <h3>{{ item.title }}</h3><p>{{ item.summary }}</p><div><span v-for="tag in item.meta.slice(0,3)" :key="tag">{{ tag }}</span></div>
            </article>
          </div>
          <p v-else class="empty-group">暂未找到相关{{ RESOURCE_LABELS[kind] }}</p>
        </section>
      </template>
      <section v-else class="result-group scoped-group">
        <header><div><span class="type-mark">{{ RESOURCE_LABELS[scope].slice(0,1) }}</span><h2>{{ RESOURCE_LABELS[scope] }}结果</h2><em>{{ scopedResults.length }}</em></div></header>
        <div v-if="scopedResults.length" class="result-list">
          <article v-for="item in scopedResults" :key="item.id" class="result-card" @click="openItem(item)">
            <h3>{{ item.title }}</h3><p>{{ item.summary }}</p><div><span v-for="tag in item.meta" :key="tag">{{ tag }}</span></div>
          </article>
        </div>
        <p v-else class="empty-group">没有找到相关结果，请更换关键词。</p>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Right, Search } from '@element-plus/icons-vue'
import { RESOURCE_LABELS, searchAllResources, searchResource } from '@/services/unifiedSearch'
import type { ResourceKind, ResourceSearchGroups, ResourceSearchItem } from '@/types/search'

const props = withDefaults(defineProps<{ scope?: ResourceKind | 'all'; initialQuery?: string; compact?: boolean }>(), { scope: 'all', initialQuery: '', compact: false })
const router = useRouter(); const route = useRoute()
const scope = computed(() => props.scope)
const query = ref(props.initialQuery || String(route.query.q || ''))
const loading = ref(false); const searched = ref(false); const error = ref('')
const groups = reactive<ResourceSearchGroups>({ paper: [], patent: [], scholar: [], project: [], fund: [] })
const scopedResults = ref<ResourceSearchItem[]>([])
const resourceOrder: ResourceKind[] = ['paper', 'patent', 'scholar', 'project', 'fund']
const placeholder = computed(() => props.scope === 'all' ? '输入研究主题、技术名称、学者或关键词，发现相关论文、专利、学者、项目与基金' : `输入关键词检索${RESOURCE_LABELS[props.scope]}`)

async function runSearch() {
  const text = query.value.trim(); if (!text) return
  loading.value = true; error.value = ''; searched.value = true
  try {
    if (props.scope === 'all') Object.assign(groups, await searchAllResources(text))
    else scopedResults.value = await searchResource(text, props.scope)
    await router.replace({ query: { ...route.query, q: text } })
  } catch (e) { error.value = e instanceof Error ? e.message : '检索失败，请稍后重试' }
  finally { loading.value = false }
}

function openCategory(kind: ResourceKind) { router.push({ name: `resource-${kind}`, query: { q: query.value.trim() } }) }
function openItem(item: ResourceSearchItem) {
  if (item.type === 'paper' && item.paperId) router.push({ name: 'paper-graph', params: { paperId: item.paperId }, query: { title: item.title } })
  else openCategory(item.type)
}
watch(() => props.initialQuery, (value) => { if (value) query.value = value })
watch(() => route.query.q, (value) => { const next=String(value||''); if(next&&next!==query.value){query.value=next;void runSearch()} })
if (query.value.trim()) void runSearch()
</script>

<style scoped>
.unified-search{width:100%}.search-box{padding:18px;background:#fff;border:1px solid #aebdf0;border-radius:18px;box-shadow:0 18px 48px rgba(42,67,137,.13)}.search-input-wrap{display:flex;align-items:flex-start;gap:13px;min-height:92px;padding:7px}.search-input-wrap>.el-icon{margin-top:5px;color:var(--sz-primary);font-size:24px}.search-input-wrap textarea{width:100%;min-height:72px;resize:none;border:0;outline:0;color:var(--sz-navy);font:inherit;font-size:18px;line-height:1.6;background:transparent}.search-input-wrap textarea::placeholder{color:#929db2}.search-actions{display:flex;align-items:center;justify-content:space-between;padding-top:13px;border-top:1px solid var(--sz-line)}.search-actions>span{color:var(--sz-text-muted);font-size:12px}.search-actions button{height:42px;display:inline-flex;align-items:center;gap:8px;padding:0 20px;color:#fff;background:var(--sz-primary);border:0;border-radius:11px;font-weight:700;cursor:pointer}.search-actions button:disabled{opacity:.5;cursor:not-allowed}.search-results{display:grid;gap:18px;margin-top:24px}.result-group{padding:22px;background:#fff;border:1px solid var(--sz-line);border-radius:16px}.result-group>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.result-group>header>div{display:flex;align-items:center;gap:9px}.type-mark{width:30px;height:30px;display:grid;place-items:center;color:#fff;background:var(--sz-primary);border-radius:9px;font-size:13px;font-weight:800}.result-group h2{margin:0;color:var(--sz-navy);font-size:19px}.result-group header em{color:var(--sz-text-muted);font-style:normal}.result-group header button{color:var(--sz-primary);background:none;border:0;cursor:pointer}.result-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.result-list{display:grid;gap:12px}.result-card{min-width:0;padding:16px;background:#f8faff;border:1px solid #e5eaf5;border-radius:12px;cursor:pointer;transition:.18s}.result-card:hover{transform:translateY(-2px);border-color:#b9c7ea;box-shadow:0 8px 22px rgba(31,47,83,.08)}.result-card h3{margin:0;color:var(--sz-navy);font-size:15px;line-height:1.45}.result-card p{display:-webkit-box;margin:9px 0;color:var(--sz-text-secondary);font-size:12px;line-height:1.65;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.result-card>div{display:flex;flex-wrap:wrap;gap:6px}.result-card>div span{padding:3px 7px;color:#536887;background:#edf2fb;border-radius:5px;font-size:10px}.empty-group,.search-state{margin:0;padding:18px;color:var(--sz-text-muted);text-align:center}.search-state.error{color:var(--sz-danger)}.compact .search-input-wrap{min-height:64px}.compact .search-input-wrap textarea{min-height:48px}.scoped-group{padding:0;border:0;background:transparent}.scoped-group .result-card{background:#fff;padding:20px}.scoped-group .result-card p{-webkit-line-clamp:3}@media(max-width:900px){.result-grid{grid-template-columns:1fr}}@media(max-width:600px){.search-input-wrap textarea{font-size:15px}.search-actions>span{display:none}.search-actions{justify-content:flex-end}}
</style>
