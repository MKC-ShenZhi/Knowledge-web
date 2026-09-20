<template>
  <div class="page-shell paper-explorer">
    <div class="page-heading"><div><p class="page-eyebrow">Paper Explorer</p><h1 class="page-title">从论文进入知识网络</h1><p class="page-description">检索题名、摘要、作者或关键词，筛选会议与年份，选择一篇论文作为图谱中心。</p></div><button class="secondary-action" @click="router.push('/kg')">打开图谱工作台</button></div>
    <section class="search-panel surface-card">
      <div class="search-row"><el-icon><Search /></el-icon><input v-model.trim="query.q" placeholder="输入论文标题、作者、摘要或关键词" @keyup.enter="search(true)"><button class="primary-action" @click="search(true)">检索论文</button></div>
      <div class="filter-row"><label>会议<select v-model="query.conference"><option value="">全部会议</option><option v-for="v in venues" :key="v.conference" :value="v.conference">{{ v.conference }}</option></select></label><label>年份<input v-model="query.year" inputmode="numeric" placeholder="如 2025"></label><button class="clear" @click="clearFilters">清除筛选</button></div>
      <div class="topics"><span>热门主题</span><button v-for="topic in topics" :key="topic" @click="useTopic(topic)">{{ topic }}</button></div>
    </section>
    <section class="result-section">
      <aside class="result-summary"><p class="page-eyebrow">Result Set</p><strong>{{ total.toLocaleString('zh-CN') }}</strong><span>{{ query.q.trim() ? '条检索结果' : '篇可检索论文' }}</span><div class="summary-line"></div><p>当前结果可继续按会议和年份收敛，也可直接选择论文进入关系图谱。</p></aside>
      <div class="results">
        <div class="result-head"><h2>论文结果</h2><span>来自新检索服务</span></div>
        <div v-if="loading" class="state surface-card"><el-icon class="is-loading"><Loading /></el-icon> 正在检索论文…</div>
        <div v-else-if="error" class="state error surface-card"><strong>暂时无法读取论文数据</strong><span>{{ error }}</span><button @click="search(false)">重新加载</button></div>
        <div v-else-if="!papers.length" class="state surface-card">{{ query.q.trim() ? '未找到匹配论文，请调整检索条件。' : '请输入关键词开始检索。' }}</div>
        <article v-for="paper in papers" :key="paper.paper_id || paper.id" class="paper-card surface-card">
          <div class="paper-main"><div class="meta"><span>{{ paper.conference || '未知会议' }}</span><span>{{ paper.year || '年份未知' }}</span><span v-if="paper.track">{{ paper.track }}</span></div><h3>{{ paper.title || '未命名论文' }}</h3><p class="authors">{{ formatAuthors(paper.authors) }}</p><p class="abstract">{{ paper.abstract || '暂无摘要。' }}</p><div v-if="paper.keywords?.length" class="keywords"><span v-for="k in paper.keywords.slice(0,5)" :key="k">{{ k }}</span></div></div>
          <div class="paper-actions"><button class="graph-button" @click="openGraph(paper)"><el-icon><Share /></el-icon>查看关系图谱</button><a v-if="paper.pdf_url" :href="paper.pdf_url" target="_blank" rel="noopener">PDF 全文 <el-icon><TopRight /></el-icon></a></div>
        </article>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loading, Search, Share, TopRight } from '@element-plus/icons-vue'
import { fetchPaperVenues } from '@/services/api'
import { fetchRetrievalHealth, searchRetrievalPapers, type RetrievalPaper } from '@/services/retrieval'
import type { PaperVenue } from '@/types/paper'

interface PaperListItem {
  id?: number
  paper_id: string
  title: string
  abstract: string
  authors: string[]
  year: number
  conference: string
  track?: string
  keywords?: string[]
  pdf_url?: string
}

const route = useRoute()
const router = useRouter()
const papers = ref<PaperListItem[]>([])
const venues = ref<PaperVenue[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const query = reactive({
  q: String(route.query.q || ''),
  conference: String(route.query.conference || ''),
  year: String(route.query.year || ''),
})
const topics = ['knowledge graph', 'large language model', 'transformer', 'diffusion', 'graph neural network', 'security']

function formatAuthors(authors: string[]) {
  return authors?.length ? authors.slice(0, 5).join('、') + (authors.length > 5 ? ' 等' : '') : '作者信息暂缺'
}

function parseSelectedYear(): number | undefined {
  if (!query.year.trim()) return undefined
  const year = Number(query.year)
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('请输入有效的四位年份')
  }
  return year
}

function fromRetrievalPaper(paper: RetrievalPaper): PaperListItem {
  return {
    paper_id: paper.paper_id,
    title: paper.title || '',
    abstract: paper.abstract || '',
    authors: Array.isArray(paper.authors) ? paper.authors : [],
    year: Number(paper.year || 0),
    conference: paper.conference || paper.venue || '',
    track: '',
    keywords: paper.keywords || [],
    pdf_url: '',
  }
}

async function search(syncUrl = true) {
  loading.value = true
  error.value = ''
  try {
    const keyword = query.q.trim()
    const year = parseSelectedYear()

    if (keyword) {
      const data = await searchRetrievalPapers({
        query: keyword,
        top_k: 20,
        year_gte: year,
        year_lte: year,
        conference: query.conference ? [query.conference] : undefined,
      })
      papers.value = data.results.map(fromRetrievalPaper)
      total.value = papers.value.length
      if (data.state.failed_operations.length) {
        console.warn('[Retrieval] 部分检索操作失败：', data.state.failed_operations)
      }
    } else {
      const health = await fetchRetrievalHealth()
      papers.value = []
      total.value = Number.isFinite(health.lexical?.paper_count) ? health.lexical!.paper_count! : 0
    }

    if (syncUrl) {
      await router.replace({
        query: {
          q: query.q || undefined,
          conference: query.conference || undefined,
          year: query.year || undefined,
        },
      })
    }
  } catch (e) {
    papers.value = []
    total.value = 0
    error.value = e instanceof Error ? e.message : '请求失败'
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  query.q = ''
  query.conference = ''
  query.year = ''
  void search(true)
}

function useTopic(topic: string) {
  query.q = topic
  void search(true)
}

function openGraph(paper: PaperListItem) {
  router.push({ name: 'paper-graph', params: { paperId: paper.paper_id }, query: { title: paper.title } })
}

onMounted(async () => {
  fetchPaperVenues().then((data) => venues.value = data).catch(() => {})
  await search(false)
})
</script>
<style scoped>
.paper-explorer{display:flex;flex-direction:column;gap:22px}.search-panel{padding:22px}.search-row{height:54px;display:flex;align-items:center;gap:12px;padding-left:17px;background:var(--sz-bg);border:1px solid #dfe5ef;border-radius:11px}.search-row>.el-icon{color:var(--sz-primary);font-size:20px}.search-row input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:var(--sz-text)}.search-row .primary-action{height:100%;border-radius:0 10px 10px 0}.filter-row{display:flex;align-items:flex-end;gap:14px;margin-top:16px}.filter-row label{display:flex;flex-direction:column;gap:7px;color:var(--sz-text-muted);font-size:12px}.filter-row select,.filter-row input{height:38px;min-width:180px;padding:0 11px;color:var(--sz-text);background:#fff;border:1px solid var(--sz-line);border-radius:8px;outline:0}.clear{height:38px;color:var(--sz-text-secondary);background:none;border:0;cursor:pointer}.topics{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:17px}.topics>span{margin-right:5px;color:var(--sz-text-muted);font-size:12px}.topics button{padding:6px 10px;color:#466188;background:#f3f6fb;border:0;border-radius:6px;cursor:pointer}.topics button:hover{color:var(--sz-primary);background:var(--sz-primary-soft)}.result-section{display:grid;grid-template-columns:210px minmax(0,1fr);gap:24px}.result-summary{position:sticky;top:0;align-self:start;padding:20px 4px}.result-summary>strong{display:block;color:var(--sz-navy);font-size:34px}.result-summary>span,.result-summary>p{color:var(--sz-text-muted);font-size:13px;line-height:1.7}.summary-line{width:42px;height:3px;margin:20px 0;background:var(--sz-primary)}.result-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.result-head h2{margin:0;color:var(--sz-text);font-size:20px}.result-head span{color:var(--sz-text-muted);font-size:12px}.results{min-width:0}.paper-card{display:flex;justify-content:space-between;gap:24px;padding:23px 25px;margin-bottom:12px;transition:.18s}.paper-card:hover{border-color:#bcc9e5;box-shadow:0 10px 26px #1f2f5312}.paper-main{min-width:0}.meta,.keywords{display:flex;flex-wrap:wrap;gap:7px}.meta span{padding:4px 8px;color:var(--sz-primary);background:var(--sz-primary-soft);border-radius:5px;font-size:11px;font-weight:700}.paper-card h3{margin:13px 0 7px;color:var(--sz-navy);font-size:18px;line-height:1.45}.authors{margin:0;color:#657188;font-size:13px}.abstract{display:-webkit-box;margin:13px 0;color:var(--sz-text-secondary);font-size:13px;line-height:1.7;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.keywords span{color:#738096;font-size:11px}.paper-actions{width:145px;flex:0 0 145px;display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:11px}.paper-actions button,.paper-actions a{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 10px;border-radius:8px;text-decoration:none;font-size:12px}.graph-button{color:#fff;background:var(--sz-primary);border:0;cursor:pointer}.paper-actions a{color:var(--sz-primary);border:1px solid #ced7eb}.state{min-height:140px;padding:30px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--sz-text-muted)}.state.error strong{color:var(--sz-danger)}.state button,.load-more{padding:9px 18px;color:var(--sz-primary);background:#fff;border:1px solid #ced7eb;border-radius:8px;cursor:pointer}.load-more{display:block;margin:18px auto}
@media(max-width:850px){.result-section{grid-template-columns:1fr}.result-summary{display:none}.paper-card{flex-direction:column}.paper-actions{width:auto;flex:auto;flex-direction:row}.filter-row{flex-wrap:wrap}.page-heading{align-items:flex-start;flex-direction:column}}@media(max-width:560px){.search-row{height:auto;flex-wrap:wrap;padding:12px}.search-row .primary-action{width:100%;height:42px;border-radius:8px}.filter-row label,.filter-row select,.filter-row input{width:100%}}
</style>
