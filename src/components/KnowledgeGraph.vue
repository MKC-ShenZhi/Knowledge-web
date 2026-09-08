<template>
  <section class="kg-workbench">
    <header class="workbench-header">
      <div class="header-title">
        <h1>论文关系图谱</h1>
        <p>
          <span>探索论文之间的引用关系</span>
        </p>
      </div>

      <div v-if="centerPaper" class="current-paper" :title="centerPaper.title">
        {{ centerPaper.title }}
      </div>

      <div class="header-actions">
        <div v-if="centerPaper" class="layout-tabs" aria-label="图谱布局">
          <span>布局</span>
          <button v-for="item in layoutOptions" :key="item.value" type="button" :class="{ active: currentLayout === item.value }" @click="changeLayout(item.value)">{{ item.label }}</button>
        </div>
        <div v-if="centerPaper" class="graph-limits" aria-label="图谱显示范围">
          <label>层数<select v-model.number="graphDepth" @change="reloadGraph"><option :value="1">1</option><option :value="2">2</option><option :value="3">3</option></select></label>
          <label>每层<select v-model.number="nodesPerLayer" @change="refreshGraph(true)"><option :value="8">8</option><option :value="12">12</option><option :value="16">16</option><option :value="20">20</option></select></label>
          <span>最多 50 节点</span>
        </div>
        <div v-if="centerPaper" class="direction-tabs" aria-label="相关论文方向">
          <button
            v-for="item in directionOptions"
            :key="item.value"
            type="button"
            :class="{ active: directionFilter === item.value }"
            @click="changeDirection(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
        <button v-if="centerPaper" type="button" class="icon-button" title="适应画布" @click="fitGraph">
          <el-icon><Aim /></el-icon>
        </button>
      </div>
    </header>

    <div class="workbench-body">
      <aside class="related-panel">
        <div class="search-block">
          <label>搜索中心论文</label>
          <el-select
            v-model="searchPaperId"
            filterable
            remote
            clearable
            reserve-keyword
            :remote-method="searchPapers"
            :loading="searchLoading"
            placeholder="输入论文标题…"
            no-data-text="请输入标题搜索"
            @change="handleSearchSelection"
            @clear="resetGraph"
          >
            <el-option
              v-for="option in searchOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <p v-if="searchError" class="inline-error">{{ searchError }}</p>
        </div>

        <div class="related-scroll">
          <RelatedPaperList
            v-if="centerPaper"
            :center-paper="centerPaper"
            :papers="filteredRelatedPapers"
            :selected-id="selectedPaperId"
            @select="selectPaper"
          />

          <div v-else class="welcome-state">
            <span class="welcome-mark">⌕</span>
            <strong>从一篇论文开始</strong>
            <p>输入论文标题并选择结果，左侧将列出它引用的论文和引用它的论文。</p>
          </div>
        </div>
      </aside>

      <main class="graph-panel">
        <RelationGraph
          ref="relationGraph$"
          class="relation-graph"
          :options="graphOptions"
          :on-node-click="onNodeClick"
        >
          <template #node="{ node }">
            <div
              class="paper-node"
              :class="{
                center: graphNodeId(node) === centerPaperId,
                selected: graphNodeId(node) === selectedGraphNode?.id
              }"
              :style="nodeStyle(node)"
            >
              <span class="node-label">{{ graphNodeLabel(node) }}</span>
              <span class="node-year">{{ graphNodeMeta(node) }}</span>
            </div>
          </template>
        </RelationGraph>

        <div v-if="graphLoading" class="canvas-overlay loading-state">
          <span class="loading-ring" />
          <strong>正在构建论文关系图谱</strong>
          <p>正在加载论文和引用关系…</p>
        </div>

        <div v-else-if="graphError" class="canvas-overlay error-state">
          <strong>图谱加载失败</strong>
          <p>{{ graphError }}</p>
          <button type="button" @click="reloadGraph">
            <el-icon><RefreshRight /></el-icon>
            重新加载
          </button>
        </div>

        <div v-else-if="!centerPaper" class="canvas-overlay empty-state">
          <div class="empty-visual">
            <span />
            <span />
            <span />
          </div>
          <strong>搜索论文，探索学术脉络</strong>
          <p>图谱将按类型展示论文、作者、年份、会议及其他关联实体。</p>
        </div>

        <div v-if="centerPaper && !graphLoading && !graphError" class="canvas-legend">
          <span><i class="legend-dot origin" />蓝色外环：中心节点</span>
          <span v-for="item in nodeTypeLegend" :key="item.type"><i class="legend-dot" :style="{ backgroundColor: item.color }" />{{ item.label }}</span>
          <span>箭头表示引用方向</span>
          <span>{{ displayGraphData.nodes.length }} 个节点 · {{ displayGraphData.lines.length }} 条关系</span>
        </div>
      </main>

      <div class="detail-panel">
        <section v-if="selectedGraphNode && selectedGraphNode.data?.type !== 'Paper'" class="entity-detail">
          <p class="page-eyebrow">{{ nodeTypeLabel(selectedGraphNode.data?.type) }}</p><h2>{{ selectedGraphNode.text }}</h2><p>{{ selectedGraphNode.data?.description || '当前节点暂无更多描述。' }}</p>
          <dl><template v-for="item in entityMeta" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></template></dl>
        </section>
        <KgNodeDetail v-else
          :paper="selectedPaper"
          :loading="detailLoading"
          :error="detailError"
          :is-center="selectedPaperId === centerPaperId"
          @retry="retryDetail"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import RelationGraph, {
  type RGJsonData,
  type RGNode,
  type RGUserEvent,
  type RelationGraphComponent,
  type RGLayoutOptions,
  RGJunctionPoint,
  RGLineShape,
  RGNodeShape,
} from 'relation-graph/vue3'
import { Aim, RefreshRight } from '@element-plus/icons-vue'
import { ElIcon, ElOption, ElSelect } from 'element-plus'
import KgNodeDetail from './KgNodeDetail.vue'
import RelatedPaperList from './RelatedPaperList.vue'
import { kg } from '@/services/kg'
import {
  KG_NODE_COLORS,
  type KGNodeType,
  type KGGraphData,
  type KGGraphLine,
  type KGGraphNode,
  type PaperDetail,
  type PaperSearchHit,
  type RelatedPaperDirection,
  type RelatedPaperItem,
} from '@/types/kg'

type DirectionFilter = 'all' | 'references' | 'citations'
type LayoutMode = 'radial' | 'treeHorizontal' | 'treeVertical' | 'force'

interface SearchOption {
  value: string
  label: string
}

const directionOptions: { value: DirectionFilter; label: string }[] = [
  { value: 'all', label: '全部相关' },
  { value: 'references', label: '参考文献' },
  { value: 'citations', label: '引用本文' },
]
const layoutOptions: { value: LayoutMode; label: string }[] = [
  { value: 'radial', label: '环形' },
  { value: 'treeHorizontal', label: '横向树' },
  { value: 'treeVertical', label: '纵向树' },
  { value: 'force', label: '力导向' },
]

function createGraphLayout(layout: LayoutMode, nodeCount = 0): RGLayoutOptions {
  if (layout === 'radial') {
    // 星型引用网络的同层节点较多，半径随节点数增长，避免节点和标签堆叠。
    const radius = Math.max(260, Math.ceil(Math.max(nodeCount - 1, 1) * 86 / (Math.PI * 2)))
    return { label: '环形布局', layoutName: 'center', layoutClassName: 'seeks-layout-center', levelDistance: String(radius), startAngle: -90 }
  }
  if (layout === 'treeHorizontal') {
    return { label: '横向树布局', layoutName: 'tree', from: 'left', layoutClassName: 'seeks-layout-tree', levelDistance: '230', hGap: 210, vGap: 92, min_per_width: 190, max_per_width: 260, min_per_height: 88 }
  }
  if (layout === 'treeVertical') {
    return { label: '纵向树布局', layoutName: 'tree', from: 'top', layoutClassName: 'seeks-layout-tree', levelDistance: '190', hGap: 128, vGap: 180, min_per_width: 128, min_per_height: 150, max_per_height: 220 }
  }
  return { label: '力导向布局', layoutName: 'force', layoutClassName: 'seeks-layout-force', maxLayoutTimes: 620, byNode: true, byLine: true, force_node_repulsion: 3.4, force_line_elastic: 0.025 }
}

const NODE_TYPE_LABELS: Record<string, string> = { Paper:'论文',Author:'作者',Venue:'会议',ConferenceEdition:'会议届次',Keyword:'关键词',Subject:'主题',Year:'年份',Institution:'机构',Method:'方法',Fund:'基金',Project:'项目',Patent:'专利' }

const route = useRoute()
const relationGraph$ = ref<RelationGraphComponent>()
const currentLayout = ref<LayoutMode>('radial')
const searchPaperId = ref<string | null>(null)
const searchOptions = ref<SearchOption[]>([])
const searchLoading = ref(false)
const searchError = ref('')
const graphLoading = ref(false)
const graphError = ref('')
const detailLoading = ref(false)
const detailError = ref('')
const centerPaperId = ref<string | null>(null)
const selectedPaperId = ref<string | null>(null)
const selectedGraphNode = ref<KGGraphNode | null>(null)
const graphDepth = ref(1)
const nodesPerLayer = ref(16)
const directionFilter = ref<DirectionFilter>('all')
const rawGraphData = ref<KGGraphData>({ rootId: '', nodes: [], lines: [] })
const centerPaperDetail = ref<PaperDetail | null>(null)
const selectedPaper = ref<PaperDetail | null>(null)

const searchHitCache = new Map<string, PaperSearchHit>()
const detailCache = new Map<string, PaperDetail>()
let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchRequestSequence = 0
let graphRequestSequence = 0
let detailRequestSequence = 0

const graphOptions = {
  debug: false,
  showDebugPanel: false,
  showExpandHolder: false,
  defaultExpandHolderPosition: 'hide' as const,
  defaultNodeBorderWidth: 0,
  defaultNodeColor: 'transparent',
  defaultNodeShape: 0 as RGNodeShape,
  defaultLineShape: 1 as RGLineShape,
  defaultLineWidth: 1.2,
  defaultLineColor: '#e5e7eb',
  defaultLineText: '',
  defaultJunctionPoint: 'border' as RGJunctionPoint,
  allowShowZoomMenu: false,
  allowSwitchLineShape: false,
  allowSwitchJunctionPoint: false,
  moveToCenterWhenRefresh: true,
  zoomToFitWhenRefresh: true,
  useAnimationWhenRefresh: true,
  defaultFocusRootNode: false,
  placeSingleNode: true,
  layouts: [createGraphLayout('radial')],
}

const paperNodes = computed(() =>
  rawGraphData.value.nodes.filter((node) => node.data?.type === 'Paper'),
)

const paperNodeMap = computed(() =>
  new Map(paperNodes.value.map((node) => [node.id, node] as const)),
)

const citationCountMap = computed(() => {
  const result = new Map<string, number>()
  for (const line of rawGraphData.value.lines) {
    if (line.data?.type !== 'CITES') continue
    result.set(line.to, (result.get(line.to) || 0) + 1)
  }
  return result
})

const referenceCountMap = computed(() => {
  const result = new Map<string, number>()
  for (const line of rawGraphData.value.lines) {
    if (line.data?.type !== 'CITES') continue
    result.set(line.from, (result.get(line.from) || 0) + 1)
  }
  return result
})

const centerPaper = computed(() => {
  if (!centerPaperId.value) return null
  if (centerPaperDetail.value?.paper_id === centerPaperId.value) return centerPaperDetail.value
  const node = paperNodeMap.value.get(centerPaperId.value)
  return node ? paperDetailFromNode(node) : null
})

const allRelatedPapers = computed<RelatedPaperItem[]>(() => {
  const centerId = centerPaperId.value
  if (!centerId) return []

  const directionMap = new Map<string, Set<Exclude<RelatedPaperDirection, 'both'>>>()
  for (const line of rawGraphData.value.lines) {
    if (line.data?.type !== 'CITES') continue
    if (line.from === centerId && paperNodeMap.value.has(line.to)) {
      if (!directionMap.has(line.to)) directionMap.set(line.to, new Set())
      directionMap.get(line.to)!.add('reference')
    }
    if (line.to === centerId && paperNodeMap.value.has(line.from)) {
      if (!directionMap.has(line.from)) directionMap.set(line.from, new Set())
      directionMap.get(line.from)!.add('citation')
    }
  }

  return [...directionMap.entries()]
    .map(([paperId, directions]) => {
      const node = paperNodeMap.value.get(paperId)!
      const base = detailCache.get(paperId) || paperDetailFromNode(node)
      const relationDirection: RelatedPaperDirection = directions.size > 1
        ? 'both'
        : [...directions][0]
      return { ...base, relationDirection }
    })
    .sort((a, b) =>
      b.citationCount - a.citationCount ||
      b.year - a.year ||
      a.title.localeCompare(b.title),
    )
})

const filteredRelatedPapers = computed(() => {
  if (directionFilter.value === 'all') return allRelatedPapers.value
  const target = directionFilter.value === 'references' ? 'reference' : 'citation'
  return allRelatedPapers.value.filter(
    (paper) => paper.relationDirection === target || paper.relationDirection === 'both',
  )
})

function balancedNodes(nodes: KGGraphNode[], limit: number): KGGraphNode[] {
  const groups = new Map<string, KGGraphNode[]>()
  for (const node of nodes) { const type=String(node.data?.type||'Unknown'); if(!groups.has(type)) groups.set(type,[]); groups.get(type)!.push(node) }
  const result: KGGraphNode[]=[]; const buckets=[...groups.values()]
  while(result.length<limit && buckets.some(group=>group.length)){for(const group of buckets){const node=group.shift();if(node)result.push(node);if(result.length>=limit)break}}
  return result
}

const limitedGraphData = computed<KGGraphData>(() => {
  const rootId=centerPaperId.value||rawGraphData.value.rootId; if(!rootId)return{rootId:'',nodes:[],lines:[]}
  const nodeMap=new Map(rawGraphData.value.nodes.map(node=>[node.id,node] as const)); if(!nodeMap.has(rootId))return{rootId,nodes:[],lines:[]}
  const adjacency=new Map<string,Set<string>>(); for(const line of rawGraphData.value.lines){if(!adjacency.has(line.from))adjacency.set(line.from,new Set());if(!adjacency.has(line.to))adjacency.set(line.to,new Set());adjacency.get(line.from)!.add(line.to);adjacency.get(line.to)!.add(line.from)}
  const selected=new Set<string>([rootId]); let frontier=[rootId]
  for(let level=1;level<=graphDepth.value && selected.size<50;level++){
    const candidates=[...new Set(frontier.flatMap(id=>[...(adjacency.get(id)||[])]))].filter(id=>!selected.has(id)).map(id=>nodeMap.get(id)).filter((node):node is KGGraphNode=>Boolean(node))
    const chosen=balancedNodes(candidates,Math.min(nodesPerLayer.value,50-selected.size)); chosen.forEach(node=>selected.add(node.id)); frontier=chosen.map(node=>node.id); if(!frontier.length)break
  }
  return {rootId,nodes:rawGraphData.value.nodes.filter(node=>selected.has(node.id)),lines:rawGraphData.value.lines.filter(line=>selected.has(line.from)&&selected.has(line.to))}
})

const nodeTypeLegend = computed(() => [...new Set(limitedGraphData.value.nodes.map(node=>String(node.data?.type||'Unknown')))].map(type=>({type,label:nodeTypeLabel(type),color:KG_NODE_COLORS[type as KGNodeType]?.color||'#64748b'})))

const displayGraphData = computed<RGJsonData>(() => {
  const nodes = limitedGraphData.value.nodes
    .map((node) => {
      const citations = node.data?.citeCount ?? citationCountMap.value.get(node.id) ?? 0
      const references = referenceCountMap.value.get(node.id) ?? 0
      const degree = citations + references
      const isCenter = node.id === centerPaperId.value
      const isPaper=node.data?.type==='Paper'; const size = isCenter ? 68 : isPaper?Math.min(42+Math.sqrt(Math.max(degree,1))*7,58):44
      const type=String(node.data?.type||'Unknown'); const color=KG_NODE_COLORS[type as KGNodeType]?.color||'#64748b'
      return {
        id: node.id,
        text: node.text,
        width: size,
        height: size,
        elWidth: size,
        elHeight: size,
        color: 'transparent',
        borderWidth: 0,
        data: {
          ...node.data,
          title: node.text,
          shortLabel: isPaper?shortPaperLabel(node):node.text,
          size,
          isCenter,
          nodeColor: color,
          nodeTypeLabel: nodeTypeLabel(type),
          citationCount: citations,
        },
      }
    })

  const lines = limitedGraphData.value.lines
    .map((line) => {
      const active = line.from === selectedGraphNode.value?.id || line.to === selectedGraphNode.value?.id
      return {
        ...line,
        text: '',
        color: active ? '#002fa7' : '#d7dce5',
        lineWidth: active ? 2 : 1.15,
        showEndArrow: true,
        useTextPath: false,
      }
    })

  return {
    rootId: centerPaperId.value || '',
    nodes,
    lines,
  }
})

function nodeTypeLabel(type: unknown): string { return NODE_TYPE_LABELS[String(type||'')]||String(type||'节点') }
const entityMeta=computed(()=>{const node=selectedGraphNode.value;if(!node)return[];const entries=[['类型',nodeTypeLabel(node.data?.type)],['年份',node.data?.year],['会议',node.data?.venue],['机构',node.data?.institution],['项目',node.data?.project],['基金',node.data?.fund],['方法',node.data?.method]];return entries.filter(([,value])=>value!==undefined&&value!==null&&value!=='').map(([label,value])=>({label:String(label),value:String(value)}))})

function paperDetailFromNode(node: KGGraphNode): PaperDetail {
  const cached = detailCache.get(node.id)
  if (cached) return cached

  const keywords = rawGraphData.value.lines
    .filter((line) => line.data?.type === 'HAS_KEYWORD' && line.from === node.id)
    .map((line) => rawGraphData.value.nodes.find((candidate) => candidate.id === line.to)?.text || '')
    .filter(Boolean)

  return {
    paper_id: node.id,
    title: node.text,
    authors: node.data?.authors || [],
    year: Number(node.data?.year || 0),
    venue: node.data?.venue || '',
    abstract: node.data?.abstract || node.data?.description || '',
    doi: node.data?.doi,
    pdf_url: node.data?.pdf_url,
    citationCount: Number(node.data?.citeCount ?? citationCountMap.value.get(node.id) ?? 0),
    referenceCount: Number(referenceCountMap.value.get(node.id) ?? 0),
    keywords: node.data?.keywords?.length ? node.data.keywords : keywords,
    externalUrl: node.data?.doi?.startsWith('http') ? node.data.doi : undefined,
  }
}

function paperDetailFromHit(hit: PaperSearchHit): PaperDetail {
  return {
    ...hit,
    citationCount: Number(hit.citationCount || 0),
    referenceCount: Number(hit.referenceCount || 0),
    keywords: hit.keywords || [],
    externalUrl: hit.doi?.startsWith('http') ? hit.doi : undefined,
  }
}

function shortPaperLabel(node: KGGraphNode): string {
  const firstAuthor = node.data?.authors?.[0]?.trim()
  if (firstAuthor) {
    const parts = firstAuthor.split(/\s+/)
    return parts[parts.length - 1] || firstAuthor
  }
  const words = node.text.split(/\s+/).filter(Boolean)
  return words.slice(0, 2).join(' ') || 'Paper'
}

function asGraphNode(node: unknown): RGNode {
  return node as RGNode
}

function graphNodeId(node: unknown): string {
  return asGraphNode(node).id
}

function graphNodeLabel(node: unknown): string {
  const graphNode = asGraphNode(node)
  return String(graphNode.data?.shortLabel || graphNode.text || 'Paper')
}

function graphNodeMeta(node: unknown): string {
  const graphNode=asGraphNode(node)
  return graphNode.data?.type==='Paper'?String(graphNode.data?.year||'论文'):String(graphNode.data?.nodeTypeLabel||'节点')
}

function nodeStyle(node: unknown): Record<string, string> {
  const graphNode = asGraphNode(node)
  const size = Number(graphNode.data?.size || 48)
  const venueColor = String(graphNode.data?.nodeColor || '#64748b')
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: venueColor,
    '--node-color': venueColor,
  }
}

function searchPapers(query: string): void {
  if (searchTimer) clearTimeout(searchTimer)
  const text = query.trim()
  if (!text) {
    searchOptions.value = []
    searchError.value = ''
    return
  }

  const sequence = ++searchRequestSequence
  searchTimer = setTimeout(async () => {
    searchLoading.value = true
    searchError.value = ''
    try {
      const { results } = await kg.search(text)
      if (sequence !== searchRequestSequence) return
      searchHitCache.clear()
      for (const result of results) searchHitCache.set(result.paper_id, result)
      searchOptions.value = results.map((result) => ({
        value: result.paper_id,
        label: `${result.title}${result.year ? ` · ${result.year}` : ''}${result.venue ? ` · ${result.venue}` : ''}`,
      }))
      if (!results.length) searchError.value = '没有找到匹配论文，请尝试其他关键词。'
    } catch (error) {
      if (sequence !== searchRequestSequence) return
      searchOptions.value = []
      searchError.value = error instanceof Error ? error.message : '论文搜索失败'
    } finally {
      if (sequence === searchRequestSequence) searchLoading.value = false
    }
  }, 280)
}

async function handleSearchSelection(paperId: string | null): Promise<void> {
  if (!paperId) return
  const hit = searchHitCache.get(paperId)
  if (hit) {
    const detail = paperDetailFromHit(hit)
    detailCache.set(paperId, detail)
    centerPaperDetail.value = detail
    selectedPaper.value = detail
  }
  await loadGraph(paperId)
}

async function loadGraph(paperId: string): Promise<void> {
  const sequence = ++graphRequestSequence
  graphLoading.value = true
  graphError.value = ''
  directionFilter.value = 'all'
  centerPaperId.value = paperId
  selectedPaperId.value = paperId

  try {
    const graph = await kg.graph(paperId, graphDepth.value)
    if (sequence !== graphRequestSequence) return

    rawGraphData.value = graph
    const centerNode = rawGraphData.value.nodes.find((node) => node.id === paperId)
    if (centerNode) {
      selectedGraphNode.value = centerNode
      const immediate = detailCache.get(paperId) || paperDetailFromNode(centerNode)
      centerPaperDetail.value = immediate
      selectedPaper.value = immediate
    }

    await nextTick()
    refreshGraph(true)
    void loadPaperDetail(paperId, true)
  } catch (error) {
    if (sequence !== graphRequestSequence) return
    rawGraphData.value = { rootId: paperId, nodes: [], lines: [] }
    graphError.value = error instanceof Error ? error.message : '知识图谱加载失败'
  } finally {
    if (sequence === graphRequestSequence) graphLoading.value = false
  }
}

async function selectPaper(paperId: string): Promise<void> {
  selectedPaperId.value = paperId
  const node = paperNodeMap.value.get(paperId)
  if (node) { selectedGraphNode.value=node; selectedPaper.value = detailCache.get(paperId) || paperDetailFromNode(node) }
  refreshGraph(false)
  relationGraph$.value?.getInstance()?.focusNodeById(paperId)
  await loadPaperDetail(paperId, false)
}

async function loadPaperDetail(paperId: string, isCenter: boolean): Promise<void> {
  const cached = detailCache.get(paperId)
  if (cached) {
    if (isCenter) centerPaperDetail.value = cached
    if (selectedPaperId.value === paperId) selectedPaper.value = cached
  }

  const sequence = ++detailRequestSequence
  detailLoading.value = true
  detailError.value = ''
  try {
    const detail = await kg.detail(paperId)
    if (sequence !== detailRequestSequence) return
    detailCache.set(paperId, detail)
    if (isCenter || centerPaperId.value === paperId) centerPaperDetail.value = detail
    if (selectedPaperId.value === paperId) selectedPaper.value = detail
  } catch (error) {
    if (sequence !== detailRequestSequence) return
    detailError.value = error instanceof Error ? error.message : '论文详情加载失败'
  } finally {
    if (sequence === detailRequestSequence) detailLoading.value = false
  }
}

function onNodeClick(node: RGNode, _event: RGUserEvent): boolean {
  const source=rawGraphData.value.nodes.find(item=>item.id===node.id)
  if(source?.data?.type==='Paper') void selectPaper(node.id)
  else if(source){selectedGraphNode.value=source;selectedPaperId.value=null;selectedPaper.value=null;refreshGraph(false)}
  return true
}

function changeDirection(direction: DirectionFilter): void {
  directionFilter.value = direction
  nextTick(() => refreshGraph(false))
}

function refreshGraph(reLayout: boolean): void {
  const component = relationGraph$.value
  if (!component) return
  component.setJsonData(displayGraphData.value, reLayout, async (instance) => {
    if (reLayout) await instance.zoomToFit()
  })
}

async function fitGraph(): Promise<void> {
  await relationGraph$.value?.getInstance()?.zoomToFit()
}

async function changeLayout(layout: LayoutMode): Promise<void> {
  currentLayout.value = layout
  const instance = relationGraph$.value?.getInstance()
  if (!instance) return
  await instance.switchLayout(createGraphLayout(layout, displayGraphData.value.nodes.length), true, true)
  await instance.zoomToFit()
}

function reloadGraph(): void {
  if (centerPaperId.value) void loadGraph(centerPaperId.value)
}

function retryDetail(): void {
  if (selectedPaperId.value) void loadPaperDetail(selectedPaperId.value, selectedPaperId.value === centerPaperId.value)
}

function resetGraph(): void {
  graphRequestSequence += 1
  detailRequestSequence += 1
  centerPaperId.value = null
  selectedPaperId.value = null
  selectedGraphNode.value = null
  centerPaperDetail.value = null
  selectedPaper.value = null
  graphError.value = ''
  detailError.value = ''
  rawGraphData.value = { rootId: '', nodes: [], lines: [] }
  refreshGraph(true)
}

onMounted(() => {
  const paperId = typeof route.params.paperId === 'string' ? route.params.paperId : ''
  if (paperId) {
    searchPaperId.value = paperId
    const title = typeof route.query.title === 'string' ? route.query.title : '当前论文'
    searchOptions.value = [{ value: paperId, label: title }]
    void loadGraph(paperId)
  } else refreshGraph(true)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  searchRequestSequence += 1
  graphRequestSequence += 1
  detailRequestSequence += 1
})
</script>

<style scoped>
.kg-workbench {
  --sz-primary: #002fa7;
  --sz-primary-soft: #e9eefb;
  --sz-background: #f7f8fc;
  --sz-card: #ffffff;
  --sz-ink: #0f1419;
  --sz-ink-2: #374151;
  --sz-muted: #6b7280;
  --sz-faint: #9ca3af;
  --sz-line: #e5e7eb;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 620px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--sz-line);
  border-radius: 14px;
  background: var(--sz-background);
  color: var(--sz-ink);
  box-shadow: 0 2px 6px rgb(31 41 55 / 0.05);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
}

.workbench-header {
  display: grid;
  min-height: 60px;
  flex: 0 0 auto;
  grid-template-columns: minmax(180px, 0.8fr) minmax(240px, 1.6fr) auto;
  align-items: center;
  gap: 18px;
  padding: 0 18px;
  border-bottom: 1px solid var(--sz-line);
  background: var(--sz-card);
}

.header-title h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.header-title p {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 3px 0 0;
  color: var(--sz-faint);
  font-size: 10px;
}

.data-badge {
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--sz-primary-soft);
  color: var(--sz-primary);
}

.current-paper {
  overflow: hidden;
  color: var(--sz-ink);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layout-tabs { display:flex; align-items:center; gap:3px; padding:3px; border:1px solid var(--sz-line); border-radius:9px; background:#f7f8fc; }
.layout-tabs>span { padding:0 5px; color:var(--sz-faint); font-size:10px; }
.layout-tabs button { height:25px; padding:0 8px; color:var(--sz-muted); background:transparent; border:0; border-radius:6px; font-size:10px; cursor:pointer; }
.layout-tabs button:hover,.layout-tabs button.active { color:var(--sz-primary); background:#fff; box-shadow:0 1px 4px rgb(31 41 55 / .09); }
.graph-limits{display:flex;align-items:center;gap:6px;padding:3px 6px;border:1px solid var(--sz-line);border-radius:9px;background:#f7f8fc}.graph-limits label{display:flex;align-items:center;gap:4px;color:var(--sz-faint);font-size:10px}.graph-limits select{height:25px;padding:0 5px;color:var(--sz-ink-2);background:#fff;border:0;border-radius:6px;outline:0}.graph-limits>span{color:var(--sz-faint);font-size:9px;white-space:nowrap}

.direction-tabs {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--sz-line);
  border-radius: 9px;
  background: var(--sz-card);
}

.direction-tabs button,
.icon-button {
  border: 0;
  background: transparent;
  color: var(--sz-muted);
  cursor: pointer;
  font: inherit;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.direction-tabs button {
  height: 31px;
  padding: 0 11px;
  border-right: 1px solid var(--sz-line);
  font-size: 11px;
}

.direction-tabs button:last-child {
  border-right: 0;
}

.direction-tabs button:hover {
  color: var(--sz-primary);
}

.direction-tabs button.active {
  background: var(--sz-primary-soft);
  color: var(--sz-primary);
  font-weight: 600;
}

.icon-button {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sz-line);
  border-radius: 9px;
  font-size: 16px;
}

.icon-button:hover {
  background: #f3f4f6;
  color: var(--sz-primary);
}

.workbench-body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 292px minmax(420px, 1fr) 340px;
}

.related-panel,
.detail-panel {
  min-width: 0;
  background: var(--sz-card);
}
.entity-detail{height:100%;box-sizing:border-box;padding:24px;overflow:auto;background:#fff}.entity-detail h2{margin:8px 0 12px;color:var(--sz-navy);font-size:22px;line-height:1.4}.entity-detail>p:not(.page-eyebrow){color:var(--sz-text-secondary);font-size:13px;line-height:1.7}.entity-detail dl{display:grid;grid-template-columns:72px 1fr;gap:10px;margin-top:24px;padding-top:18px;border-top:1px solid var(--sz-line);font-size:12px}.entity-detail dt{color:var(--sz-text-muted)}.entity-detail dd{margin:0;color:var(--sz-text)}

.related-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid var(--sz-line);
}

.search-block {
  padding: 16px;
  border-bottom: 1px solid var(--sz-line);
}

.search-block label {
  display: block;
  margin-bottom: 8px;
  color: var(--sz-ink-2);
  font-size: 11px;
  font-weight: 700;
}

.search-block :deep(.el-select) {
  width: 100%;
}

.search-block :deep(.el-select__wrapper) {
  min-height: 38px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--sz-line) inset;
}

.search-block :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px rgb(0 47 167 / 0.5) inset, 0 0 0 3px rgb(0 47 167 / 0.1);
}

.inline-error {
  margin: 7px 0 0;
  color: #ef4444;
  font-size: 10px;
  line-height: 1.5;
}

.related-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.related-scroll:hover {
  scrollbar-color: var(--sz-line) transparent;
}

.welcome-state {
  display: flex;
  height: 100%;
  min-height: 260px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 24px;
  color: var(--sz-faint);
  text-align: center;
}

.welcome-mark {
  color: var(--sz-primary);
  font-size: 38px;
}

.welcome-state strong {
  margin-top: 8px;
  color: var(--sz-ink-2);
  font-size: 13px;
}

.welcome-state p {
  margin: 7px 0 0;
  font-size: 11px;
  line-height: 1.7;
}

.graph-panel {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--sz-background);
}

.relation-graph {
  width: 100%;
  height: 100%;
}

.paper-node {
  position: relative;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 3px 9px rgb(15 23 42 / 0.2);
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.paper-node:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 14px rgb(15 23 42 / 0.28);
}

.paper-node.center {
  border-color: #fff;
  box-shadow: 0 0 0 2px var(--sz-primary), 0 5px 16px rgb(0 47 167 / 0.22);
}

.paper-node.selected {
  box-shadow: 0 0 0 3px #5b21b6, 0 5px 16px rgb(91 33 182 / 0.2);
}

.node-label {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  width: 132px;
  overflow: hidden;
  transform: translateX(-50%);
  color: var(--sz-ink-2);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-year {
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}

.canvas-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: rgb(247 248 252 / 0.94);
  color: var(--sz-faint);
  text-align: center;
}

.canvas-overlay strong {
  margin-top: 14px;
  color: var(--sz-ink-2);
  font-size: 14px;
}

.canvas-overlay p {
  margin: 6px 0 0;
  font-size: 11px;
}

.loading-ring {
  width: 28px;
  height: 28px;
  border: 3px solid var(--sz-primary-soft);
  border-top-color: var(--sz-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 5px;
  margin-top: 14px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: var(--sz-primary);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.empty-visual {
  position: relative;
  width: 116px;
  height: 58px;
}

.empty-visual::before,
.empty-visual::after {
  position: absolute;
  top: 27px;
  width: 46px;
  height: 1px;
  background: #ccd5ed;
  content: '';
}

.empty-visual::before { left: 17px; transform: rotate(-17deg); }
.empty-visual::after { right: 17px; transform: rotate(17deg); }

.empty-visual span {
  position: absolute;
  z-index: 1;
  width: 22px;
  height: 22px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: rgb(0 47 167 / 0.55);
}

.empty-visual span:nth-child(1) { left: 0; bottom: 2px; }
.empty-visual span:nth-child(2) { left: 47px; top: 0; width: 28px; height: 28px; background: var(--sz-primary); }
.empty-visual span:nth-child(3) { right: 0; bottom: 2px; }

.canvas-legend {
  position: absolute;
  right: 16px;
  bottom: 14px;
  left: 16px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  color: var(--sz-faint);
  font-size: 10px;
  pointer-events: none;
}

.canvas-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.origin { box-sizing:border-box; background:#fff; border:2px solid var(--sz-primary); }

.detail-panel {
  min-height: 0;
  border-left: 1px solid var(--sz-line);
  overflow: hidden;
}

@media (max-width: 1180px) {
  .workbench-body {
    grid-template-columns: 260px minmax(390px, 1fr) 310px;
  }

  .workbench-header {
    grid-template-columns: minmax(160px, 0.6fr) minmax(180px, 1fr) auto;
  }

  .direction-tabs button {
    padding: 0 8px;
  }
  .layout-tabs>span { display:none; }
}

@media (max-width: 920px) {
  .kg-workbench {
    height: auto;
    min-height: 900px;
    overflow: visible;
  }

  .workbench-header {
    grid-template-columns: 1fr auto;
  }

  .current-paper {
    display: none;
  }

  .workbench-body {
    grid-template-columns: 250px minmax(480px, 1fr);
    grid-template-rows: 620px 420px;
    overflow-x: auto;
  }

  .detail-panel {
    grid-column: 1 / -1;
    border-top: 1px solid var(--sz-line);
    border-left: 0;
  }
}
</style>
