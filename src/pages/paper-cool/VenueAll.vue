<template>
  <div class="paper-cool page-shell">
    <header class="pc-header">
      <button class="ghost-btn" type="button" @click="$router.back()">返回</button>
      <div class="pc-title">
        <p class="page-eyebrow">Conference Explorer</p>
        <h2>按会议层级探索论文</h2>
        <p>会议 → 年份 → Track → 论文，论文检索与可检索总量来自新检索后端。</p>
      </div>
    </header>

    <section class="stats-strip">
      <div class="stat-cell">
        <span>可检索论文</span>
        <strong>{{ retrievalPaperCount === null ? "—" : retrievalPaperCount.toLocaleString() }}</strong>
      </div>
      <div class="stat-cell">
        <span>会议</span>
        <strong>{{ ACADEMIC_CONFERENCE_COUNT }}</strong>
      </div>
      <div class="stat-cell">
        <span>年份</span>
        <strong>{{ yearRange }}</strong>
      </div>
      <div class="stat-cell">
        <span>Tracks</span>
        <strong>{{ totalTracks.toLocaleString() }}</strong>
      </div>
    </section>

    <section class="search-panel">
      <div class="search-row">
        <input
          v-model="keyword"
          placeholder="搜索标题、摘要、作者、关键词或会议"
          @input="schedulePreviewSearch"
          @keyup.enter="openFullSearch"
        />
        <button type="button" @click="openFullSearch">完整搜索</button>
      </div>
      <div class="quick-row">
        <button v-for="word in quickSearchWords" :key="word" type="button" @click="useQuickSearch(word)">
          {{ word }}
        </button>
      </div>

      <div v-if="keyword.trim()" class="preview-area">
        <div class="preview-head">
          <span v-if="searchLoading">正在查询后端...</span>
          <span v-else>返回 {{ searchTotal.toLocaleString() }} 条结果</span>
          <div class="preview-head-actions">
            <button
              v-if="searchResults.length"
              type="button"
              class="toggle-preview-btn"
              @click="previewExpanded = !previewExpanded"
            >
              {{ previewExpanded ? '收起结果' : '展开结果' }}
            </button>
            <button v-if="searchResults.length" type="button" @click="openFullSearch">查看全部</button>
          </div>
        </div>
        <div v-if="searchError" class="hint error">{{ searchError }}</div>
        <div v-else-if="!searchLoading && searchResults.length === 0" class="hint">没有匹配结果。</div>
        <div v-else v-show="previewExpanded" class="preview-list">
          <article v-for="(paper, idx) in searchResults" :key="'p-' + idx + '-' + paper.title" class="preview-item">
            <button type="button" @click="openPaperContext(paper)">
              <strong>{{ paper.title }}</strong>
              <span>{{ paper.conference || paper.venue || '未知会议' }} {{ paper.year }}</span>
              <small>{{ paper.authors.slice(0, 4).join(', ') || 'Unknown authors' }}</small>
            </button>
          </article>
        </div>
      </div>
    </section>

    <section class="venue-section">
      <div class="section-head">
        <div>
          <h3>会议论文库</h3>
          <p>点击会议查看后端统计出的年份和 track。</p>
        </div>
        <input v-model="venueFilter" placeholder="筛选会议名称或描述" />
      </div>

      <p v-if="loading" class="hint">正在加载会议与论文统计...</p>
      <p v-else-if="error" class="hint error">{{ error }}</p>
      <p v-else-if="filteredVenues.length === 0" class="hint">没有匹配的会议。</p>

      <div class="venue-grid">
        <button
          v-for="venue in filteredVenues"
          :key="venue.conference"
          type="button"
          class="venue-tile"
          @click="goTrack(venue.conference)"
        >
          <span class="venue-name">{{ venue.conference }}</span>
          <span class="venue-desc">{{ venue.meta?.description || '暂无会议描述' }}</span>
          <span class="venue-stat-line">
            {{ venue.count.toLocaleString() }} papers · {{ venue.yearCount }} years · {{ venue.trackCount }} tracks
          </span>
          <span class="venue-stat-line muted">{{ venue.minYear }}-{{ venue.maxYear }}</span>
          <span v-if="venue.meta?.rank" class="rank-line">
            <b>CCF {{ venue.meta.rank.ccf || 'N' }}</b>
            <b v-if="venue.meta.rank.core">CORE {{ venue.meta.rank.core }}</b>
            <b v-if="venue.meta.rank.thcpl || venue.meta.rank.thc">THCPL {{ venue.meta.rank.thcpl || venue.meta.rank.thc }}</b>
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ACADEMIC_CONFERENCE_COUNT } from "../../config/knowledgeStats";
import { fetchConferences, fetchPaperVenues } from "../../services/api";
import { fetchRetrievalHealth, searchRetrievalPapers } from "../../services/retrieval";
import type { RetrievalPaper } from "../../services/retrieval";
import type { Conference } from "../../types/conference";
import type { PaperVenue } from "../../types/paper";

interface EnrichedVenue extends PaperVenue {
  meta?: Conference;
}

const router = useRouter();
const keyword = ref("");
const venueFilter = ref("");
const loading = ref(false);
const error = ref("");
const venueList = ref<EnrichedVenue[]>([]);
const retrievalPaperCount = ref<number | null>(null);
const searchResults = ref<RetrievalPaper[]>([]);
const searchTotal = ref(0);
const searchLoading = ref(false);
const searchError = ref("");
// 查询返回结果默认折叠，避免直接暴露原始返回内容
const previewExpanded = ref(false);
let previewTimer: number | undefined;
let searchSeq = 0;

const quickSearchWords = [
  "transformer",
  "diffusion",
  "large language model",
  "graph neural network",
  "speech recognition",
  "security",
  "optimization",
  "medical image"
];

const totalTracks = computed(() => venueList.value.reduce((sum, venue) => sum + venue.trackCount, 0));

const yearRange = computed(() => {
  const years = venueList.value.flatMap((venue) => [venue.minYear, venue.maxYear]).filter(Boolean);
  if (!years.length) return "-";
  return `${Math.min(...years)}-${Math.max(...years)}`;
});

const filteredVenues = computed(() => {
  const q = venueFilter.value.trim().toLowerCase();
  if (!q) return venueList.value;
  return venueList.value.filter((venue) => {
    const description = venue.meta?.description || "";
    return `${venue.conference} ${description}`.toLowerCase().includes(q);
  });
});

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function buildConferenceMap(conferences: Conference[]) {
  const map = new Map<string, Conference>();
  for (const conf of conferences) {
    const title = conf.title || "";
    const firstToken = title.split(/\s+/)[0] || "";
    for (const rawKey of [title, firstToken]) {
      if (!rawKey) continue;
      const key = normalizeKey(rawKey);
      if (!map.has(key)) map.set(key, conf);
    }
  }
  return map;
}

async function loadVenues() {
  loading.value = true;
  error.value = "";
  const [healthResult, venuesResult, conferencesResult] = await Promise.allSettled([
    fetchRetrievalHealth(),
    fetchPaperVenues(),
    fetchConferences({ sub: [], q: "" })
  ]);

  if (healthResult.status === "fulfilled" && Number.isFinite(healthResult.value.lexical?.paper_count)) {
    retrievalPaperCount.value = healthResult.value.lexical!.paper_count!;
  }

  try {
    if (venuesResult.status === "rejected") throw venuesResult.reason;
    if (conferencesResult.status === "rejected") throw conferencesResult.reason;
    const paperVenues = venuesResult.value;
    const conferences = conferencesResult.value;
    const conferenceMap = buildConferenceMap(conferences);
    venueList.value = paperVenues.map((venue) => ({
      ...venue,
      meta: conferenceMap.get(normalizeKey(venue.conference))
    }));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "会议与论文统计加载失败";
    venueList.value = [];
  } finally {
    loading.value = false;
  }
}

async function runPreviewSearch() {
  const q = keyword.value.trim();
  const seq = ++searchSeq;
  searchError.value = "";
  searchTotal.value = 0;

  if (!q) {
    searchResults.value = [];
    searchLoading.value = false;
    return;
  }

  searchLoading.value = true;
  // 新查询返回的数据默认折叠，避免直接暴露原始返回内容
  previewExpanded.value = false;
  try {
    const result = await searchRetrievalPapers({ query: q, top_k: 6 });
    if (seq !== searchSeq) return;
    searchResults.value = result.results;
    searchTotal.value = result.results.length;
  } catch (err) {
    if (seq !== searchSeq) return;
    searchResults.value = [];
    searchError.value = err instanceof Error ? err.message : "搜索失败";
  } finally {
    if (seq === searchSeq) searchLoading.value = false;
  }
}

function schedulePreviewSearch() {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(runPreviewSearch, 300);
}

function useQuickSearch(word: string) {
  keyword.value = word;
  runPreviewSearch();
}

function openFullSearch() {
  const search = keyword.value.trim();
  if (!search) return;
  router.push({
    name: "paper-explorer",
    query: { q: search }
  });
}

function openPaperContext(paper: RetrievalPaper) {
  router.push({
    name: "paper-graph",
    params: { paperId: paper.paper_id },
    query: { title: paper.title }
  });
}

function goTrack(name: string) {
  router.push({ name: "conference-detail", params: { venue: name } });
}

onMounted(loadVenues);

onBeforeUnmount(() => {
  window.clearTimeout(previewTimer);
});
</script>

<style scoped>
.paper-cool {
  max-width: 1220px;
  margin: 0 auto;
  padding: 24px 20px 40px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.pc-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.ghost-btn {
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #334155;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
}
.pc-title h2 {
  margin: 0;
  font-size: 24px;
}
.pc-title p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 14px;
}
.stats-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  margin-bottom: 14px;
}
.stat-cell {
  padding: 14px 16px;
  border-right: 1px solid #e2e8f0;
}
.stat-cell:last-child {
  border-right: 0;
}
.stat-cell span {
  display: block;
  color: #64748b;
  font-size: 12px;
  margin-bottom: 4px;
}
.stat-cell strong {
  color: #0f172a;
  font-size: 22px;
}
.search-panel,
.venue-section {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  margin-bottom: 14px;
}
.search-row {
  display: flex;
  gap: 8px;
}
.search-row input,
.section-head input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
}
.search-row input:focus,
.section-head input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
.search-row button,
.preview-head button,
.quick-row button {
  border: 0;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  padding: 0 14px;
  cursor: pointer;
  white-space: nowrap;
}
.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.quick-row button {
  background: #eff6ff;
  color: #1d4ed8;
  padding: 5px 9px;
  font-size: 12px;
}
.preview-area {
  margin-top: 14px;
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
}
.preview-head {
  display: flex;
  justify-content: space-between;
  color: #475569;
  font-size: 13px;
  margin-bottom: 8px;
}
.preview-head-actions {
  display: flex;
  gap: 8px;
}
.preview-head .toggle-preview-btn {
  background: #64748b;
  padding: 5px 10px;
}
.preview-head button {
  background: #f97316;
  padding: 5px 10px;
}
.preview-list {
  display: grid;
  gap: 8px;
}
.preview-item button {
  width: 100%;
  text-align: left;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  padding: 10px;
  cursor: pointer;
}
.preview-item button:hover {
  border-color: #93c5fd;
  background: #f8fbff;
}
.preview-item strong,
.preview-item span,
.preview-item small {
  display: block;
}
.preview-item strong {
  color: #0f172a;
  font-size: 14px;
  line-height: 1.35;
}
.preview-item span {
  color: #2563eb;
  margin-top: 4px;
  font-size: 12px;
}
.preview-item small {
  color: #64748b;
  margin-top: 3px;
}
.section-head {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 16px;
  align-items: start;
  margin-bottom: 14px;
}
.section-head h3 {
  margin: 0;
  font-size: 18px;
}
.section-head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}
.venue-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.venue-tile {
  min-height: 150px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.venue-tile:hover {
  border-color: #f97316;
  background: #fffaf5;
}
.venue-name {
  color: #ea580c;
  font-size: 18px;
  font-weight: 700;
}
.venue-desc {
  min-height: 36px;
  color: #475569;
  font-size: 13px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.venue-stat-line {
  color: #334155;
  font-size: 13px;
}
.muted {
  color: #64748b;
}
.rank-line {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.rank-line b {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 11px;
}
.hint {
  color: #64748b;
  margin: 8px 0;
}
.error {
  color: #dc2626;
}
@media (max-width: 900px) {
  .stats-strip,
  .venue-grid,
  .section-head {
    grid-template-columns: 1fr;
  }
  .stat-cell {
    border-right: 0;
    border-bottom: 1px solid #e2e8f0;
  }
  .stat-cell:last-child {
    border-bottom: 0;
  }
  .search-row {
    flex-direction: column;
  }
  .search-row button {
    padding: 10px 14px;
  }
}
.paper-cool{max-width:1500px;padding:0 0 40px}.pc-header{margin-bottom:22px}.pc-title .page-eyebrow{margin-bottom:6px}.pc-title h2{color:var(--sz-navy);font-size:32px;letter-spacing:-.03em}.ghost-btn{display:none}.stats-strip,.search-panel,.venue-section{border-color:var(--sz-line);border-radius:var(--sz-radius);box-shadow:var(--sz-shadow)}.stats-strip{margin-bottom:20px}.stat-cell{padding:20px 22px;border-color:var(--sz-line)}.stat-cell strong{color:var(--sz-navy);font-size:25px}.search-panel,.venue-section{padding:22px;margin-bottom:20px}.search-row input,.section-head input{border-color:var(--sz-line);border-radius:9px}.search-row button{background:var(--sz-primary);border-radius:9px}.quick-row button{color:var(--sz-primary);background:var(--sz-primary-soft)}.section-head h3{color:var(--sz-text);font-size:21px}.venue-grid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}.venue-tile{min-height:176px;padding:19px;border-color:var(--sz-line);border-radius:12px}.venue-tile:hover{border-color:#aebee2;background:var(--sz-primary-faint);box-shadow:0 10px 25px #1f2f5312}.venue-name{color:var(--sz-primary);font-size:21px}.rank-line b{color:var(--sz-primary);background:var(--sz-primary-soft);border-color:#c7d3ef}
</style>
