<template>
  <section class="topic-workbench">
    <header class="workbench-header">
      <div class="header-title">
        <h1>Topic 中心图谱</h1>
        <p>从研究主题出发，逐层探索论文与学术实体</p>
      </div>
      <div v-if="currentTopic" class="current-topic" :title="currentTopic">{{ currentTopic }}</div>
      <div v-if="hasGraph" class="header-actions">
        <div class="layout-tabs"><span>布局</span><button v-for="item in layoutOptions" :key="item.value" type="button" :class="{ active: currentLayout === item.value }" @click="changeLayout(item.value)">{{ item.label }}</button></div>
        <div class="graph-limits">
          <label>层数<select v-model.number="graphDepth" @change="refreshGraph(true)"><option :value="1">1</option><option :value="2">2</option><option :value="3">3</option></select></label>
          <label>每层<select v-model.number="nodesPerLayer" @change="refreshGraph(true)"><option :value="8">8</option><option :value="12">12</option><option :value="16">16</option><option :value="20">20</option></select></label>
          <span>最多 50 节点</span>
        </div>
        <button class="icon-button" type="button" title="适应画布" @click="fitGraph"><el-icon><Aim /></el-icon></button>
      </div>
    </header>

    <div class="workbench-body">
      <aside class="control-panel">
        <form class="topic-search" @submit.prevent="loadTopic">
          <label for="topic-query">搜索中心 Topic</label>
          <div class="search-input"><el-icon><Search /></el-icon><input id="topic-query" v-model="topicQuery" autocomplete="off" placeholder="如 graph neural networks" /><button type="submit" :disabled="loading">构建</button></div>
          <div class="suggestions"><button v-for="item in suggestions" :key="item" type="button" @click="useSuggestion(item)">{{ item }}</button></div>
        </form>

        <section v-if="hasGraph" class="filter-section">
          <div class="section-heading"><strong>关系筛选</strong><button type="button" @click="selectAllRelations">全部</button></div>
          <label v-for="relation in availableRelations" :key="relation.type" class="relation-option">
            <input v-model="activeRelations" type="checkbox" :value="relation.type" @change="refreshGraph(true)" />
            <i :style="{ backgroundColor: relation.color }" />
            <span>{{ relation.label }}</span><small>{{ relation.count }}</small>
          </label>
        </section>

        <section v-if="topicPapers.length" class="paper-section">
          <div class="section-heading"><strong>相关论文</strong><span>{{ topicPapers.length }}</span></div>
          <div class="paper-list">
            <button v-for="paper in topicPapers" :key="paper.id" type="button" :class="{ active: selectedNode?.id === paper.id }" @click="selectNode(paper.id)"><strong>{{ paper.text }}</strong><span>{{ paper.data?.year || '年份未知' }} · {{ paper.data?.venue || '来源未知' }}</span></button>
          </div>
        </section>
      </aside>

      <main class="graph-panel">
        <RelationGraph ref="relationGraph$" class="relation-graph" :options="graphOptions" :on-node-click="onNodeClick">
          <template #node="{ node }">
            <div class="graph-node" :class="{ center: graphNodeId(node) === rawGraphData.rootId, selected: graphNodeId(node) === selectedNode?.id }" :style="nodeStyle(node)">
              <span class="node-label">{{ graphNodeLabel(node) }}</span>
              <span class="node-meta">{{ graphNodeMeta(node) }}</span>
            </div>
          </template>
        </RelationGraph>

        <div v-if="loading" class="canvas-overlay"><span class="loading-ring" /><strong>正在构建 Topic 图谱</strong><p>正在聚合论文与相关学术实体…</p></div>
        <div v-else-if="error" class="canvas-overlay error-state"><strong>Topic 图谱加载失败</strong><p>{{ error }}</p><button type="button" @click="loadTopic"><el-icon><RefreshRight /></el-icon>重新加载</button></div>
        <div v-else-if="!hasGraph" class="canvas-overlay empty-state"><div class="empty-visual"><span /><span /><span /></div><strong>输入 Topic，建立知识网络</strong><p>首层连接相关论文，后续层级呈现作者、会议、年份、关键词和引用关系。</p></div>

        <div v-if="hasGraph && !loading && !error" class="canvas-legend">
          <span v-for="item in nodeLegend" :key="item.type"><i :style="{ backgroundColor: item.color }" />{{ item.label }}</span>
          <span>{{ displayGraphData.nodes.length }} 个节点 · {{ displayGraphData.lines.length }} 条关系</span>
        </div>
      </main>

      <aside class="detail-panel">
        <template v-if="selectedNode">
          <div class="detail-heading"><strong>节点详情</strong><span>{{ nodeTypeLabel(selectedNode.data?.type) }}</span></div>
          <div class="detail-content">
            <p class="page-eyebrow">{{ String(selectedNode.data?.type || 'NODE').toUpperCase() }}</p>
            <h2>{{ selectedNode.text }}</h2>
            <p v-if="selectedNode.data?.description" class="description">{{ selectedNode.data.description }}</p>
            <dl v-if="nodeMetadata.length"><template v-for="item in nodeMetadata" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></template></dl>
            <section class="connections"><div class="detail-section-title"><strong>关联关系</strong><span>{{ selectedConnections.length }}</span></div><div v-if="selectedConnections.length" class="connection-list"><button v-for="item in selectedConnections.slice(0, 12)" :key="item.key" type="button" @click="selectNode(item.nodeId)"><i :style="{ backgroundColor: item.color }" /><span><b>{{ item.label }}</b><small>{{ item.nodeText }}</small></span></button></div><p v-else>当前筛选条件下暂无关联。</p></section>
            <div v-if="selectedNode.data?.type === 'Paper'" class="detail-actions">
              <button type="button" class="primary-action" :disabled="expandingPaperId === selectedNode.id" @click="expandSelectedPaper">{{ expandedPaperIds.has(selectedNode.id) ? '重新获取论文关系' : '展开论文关系' }}</button>
              <button type="button" class="secondary-action" @click="openPaperGraph(selectedNode.id)">进入论文图谱</button>
              <p>按当前层级调用真实图谱接口，补充引用及其他实体关系。</p>
              <p v-if="expandError" class="expand-error">{{ expandError }}</p>
            </div>
          </div>
        </template>
        <div v-else class="detail-empty"><span>⌁</span><strong>选择节点查看详情</strong><p>点击画布或左侧列表中的节点。</p></div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RelationGraph, { RGJunctionPoint, RGLineShape, RGNodeShape, type RGJsonData, type RGLayoutOptions, type RGNode, type RGUserEvent, type RelationGraphComponent } from 'relation-graph/vue3'
import { Aim, RefreshRight, Search } from '@element-plus/icons-vue'
import { ElIcon } from 'element-plus'
import { fetchTopicSeedGraph } from '@/services/topicGraph'
import { kg } from '@/services/kg'
import { KG_NODE_COLORS, KG_RELATION_COLORS, type KGGraphData, type KGGraphLine, type KGGraphNode, type KGNodeType } from '@/types/kg'

type LayoutMode = 'radial' | 'treeHorizontal' | 'treeVertical' | 'force'
const route = useRoute(), router = useRouter()
const relationGraph$ = ref<RelationGraphComponent>()
const topicQuery = ref(''), currentTopic = ref(''), loading = ref(false), error = ref('')
const rawGraphData = ref<KGGraphData>({ rootId: '', nodes: [], lines: [] })
const selectedNode = ref<KGGraphNode | null>(null)
const activeRelations = ref<string[]>([])
const graphDepth = ref(2), nodesPerLayer = ref(16), currentLayout = ref<LayoutMode>('radial')
const expandingPaperId = ref(''), expandedPaperIds = ref(new Set<string>())
const expandError = ref('')
let requestSequence = 0

const suggestions = ['graph neural networks', 'knowledge graph', 'large language model']
const layoutOptions: { value: LayoutMode; label: string }[] = [{ value: 'radial', label: '环形' }, { value: 'treeHorizontal', label: '横向树' }, { value: 'treeVertical', label: '纵向树' }, { value: 'force', label: '力导向' }]
const TYPE_LABELS: Record<string, string> = { Topic: 'Topic', Paper: '论文', Author: '作者', Venue: '会议', ConferenceEdition: '会议届次', Keyword: '关键词', Subject: '主题', Year: '年份', Institution: '机构', Method: '方法', Fund: '基金', Project: '项目', Patent: '专利' }
const RELATION_LABELS: Record<string, string> = { HAS_PAPER: '主题相关论文', AUTHORED_BY: '作者', PUBLISHED_IN: '发表会议', PUBLISHED_YEAR: '发表年份', HAS_KEYWORD: '关键词', HAS_SUBJECT: '研究主题', CITES: '引用关系', AFFILIATED_WITH: '所属机构', USES_METHOD: '研究方法', FUNDED_BY: '基金资助', BELONGS_TO: '归属关系' }

function graphLayout(mode: LayoutMode, count = 0): RGLayoutOptions {
  if (mode === 'radial') return { label: '环形布局', layoutName: 'center', layoutClassName: 'seeks-layout-center', levelDistance: String(Math.max(260, Math.ceil(Math.max(count - 1, 1) * 82 / (Math.PI * 2)))), startAngle: -90 }
  if (mode === 'treeHorizontal') return { label: '横向树', layoutName: 'tree', from: 'left', layoutClassName: 'seeks-layout-tree', levelDistance: '225', hGap: 200, vGap: 90 }
  if (mode === 'treeVertical') return { label: '纵向树', layoutName: 'tree', from: 'top', layoutClassName: 'seeks-layout-tree', levelDistance: '185', hGap: 125, vGap: 170 }
  return { label: '力导向', layoutName: 'force', layoutClassName: 'seeks-layout-force', maxLayoutTimes: 620, byNode: true, byLine: true, force_node_repulsion: 3.4, force_line_elastic: 0.025 }
}

const graphOptions = { debug: false, showDebugPanel: false, showExpandHolder: false, defaultExpandHolderPosition: 'hide' as const, defaultNodeBorderWidth: 0, defaultNodeColor: 'transparent', defaultNodeShape: 0 as RGNodeShape, defaultLineShape: 1 as RGLineShape, defaultLineWidth: 1.2, defaultLineColor: '#e5e7eb', defaultLineText: '', defaultJunctionPoint: 'border' as RGJunctionPoint, allowShowZoomMenu: false, allowSwitchLineShape: false, allowSwitchJunctionPoint: false, moveToCenterWhenRefresh: true, zoomToFitWhenRefresh: true, useAnimationWhenRefresh: true, defaultFocusRootNode: false, placeSingleNode: true, layouts: [graphLayout('radial')] }

const hasGraph = computed(() => Boolean(rawGraphData.value.rootId && rawGraphData.value.nodes.length))
const topicPapers = computed(() => rawGraphData.value.nodes.filter(node => node.data?.type === 'Paper').slice(0, 20))
const relationCounts = computed(() => { const counts = new Map<string, number>(); for (const line of rawGraphData.value.lines) counts.set(line.data?.type || 'RELATED', (counts.get(line.data?.type || 'RELATED') || 0) + 1); return counts })
const availableRelations = computed(() => [...relationCounts.value.entries()].map(([type, count]) => ({ type, count, label: relationLabel(type), color: KG_RELATION_COLORS[type] || '#94a3b8' })))

function balanced(nodes: KGGraphNode[], limit: number): KGGraphNode[] {
  const groups = new Map<string, KGGraphNode[]>(); for (const node of nodes) { const type = String(node.data?.type || 'Unknown'); if (!groups.has(type)) groups.set(type, []); groups.get(type)!.push(node) }
  const result: KGGraphNode[] = [], buckets = [...groups.values()]; while (result.length < limit && buckets.some(group => group.length)) for (const group of buckets) { const node = group.shift(); if (node) result.push(node); if (result.length >= limit) break } return result
}

const limitedGraph = computed<KGGraphData>(() => {
  const source = rawGraphData.value, rootId = source.rootId; if (!rootId) return { rootId: '', nodes: [], lines: [] }
  const allowed = new Set(activeRelations.value), lines = source.lines.filter(line => allowed.has(line.data?.type || ''))
  const map = new Map(source.nodes.map(node => [node.id, node] as const)), adjacency = new Map<string, Set<string>>()
  for (const line of lines) { if (!adjacency.has(line.from)) adjacency.set(line.from, new Set()); if (!adjacency.has(line.to)) adjacency.set(line.to, new Set()); adjacency.get(line.from)!.add(line.to); adjacency.get(line.to)!.add(line.from) }
  const selected = new Set<string>([rootId]); let frontier = [rootId]
  for (let level = 1; level <= graphDepth.value && selected.size < 50; level++) { const candidates = [...new Set(frontier.flatMap(id => [...(adjacency.get(id) || [])]))].filter(id => !selected.has(id)).map(id => map.get(id)).filter((node): node is KGGraphNode => Boolean(node)); const chosen = balanced(candidates, Math.min(nodesPerLayer.value, 50 - selected.size)); chosen.forEach(node => selected.add(node.id)); frontier = chosen.map(node => node.id); if (!frontier.length) break }
  return { rootId, nodes: source.nodes.filter(node => selected.has(node.id)), lines: lines.filter(line => selected.has(line.from) && selected.has(line.to)) }
})

const displayGraphData = computed<RGJsonData>(() => ({
  rootId: limitedGraph.value.rootId,
  nodes: limitedGraph.value.nodes.map(node => { const center = node.id === limitedGraph.value.rootId, type = String(node.data?.type || 'Unknown'), size = center ? 76 : type === 'Paper' ? 52 : 44, color = KG_NODE_COLORS[type as KGNodeType]?.color || '#64748b'; return { id: node.id, text: node.text, width: size, height: size, elWidth: size, elHeight: size, color: 'transparent', borderWidth: 0, data: { ...node.data, size, nodeColor: color, shortLabel: shortLabel(node), nodeTypeLabel: nodeTypeLabel(type) } } }),
  lines: limitedGraph.value.lines.map(line => { const active = line.from === selectedNode.value?.id || line.to === selectedNode.value?.id; return { ...line, text: '', color: active ? (KG_RELATION_COLORS[line.data?.type] || '#002fa7') : '#d7dce5', lineWidth: active ? 2.2 : 1.1, showEndArrow: true, useTextPath: false } }),
}))

const nodeLegend = computed(() => [...new Set(limitedGraph.value.nodes.map(node => String(node.data?.type || 'Unknown')))].map(type => ({ type, label: nodeTypeLabel(type), color: KG_NODE_COLORS[type as KGNodeType]?.color || '#64748b' })))
const nodeMetadata = computed(() => { const data = selectedNode.value?.data; if (!data) return []; const values: [string, unknown][] = [['类型', nodeTypeLabel(data.type)], ['年份', data.year], ['会议', data.venue], ['作者', Array.isArray(data.authors) ? data.authors.join('、') : ''], ['结果排名', data.rank], ['相关论文数', data.resultCount], ['机构', data.institution], ['项目', data.project], ['基金', data.fund], ['方法', data.method]]; return values.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => ({ label, value: String(value) })) })
const selectedConnections = computed(() => { const id = selectedNode.value?.id; if (!id) return []; const map = new Map(rawGraphData.value.nodes.map(node => [node.id, node] as const)); return rawGraphData.value.lines.filter(line => activeRelations.value.includes(line.data?.type || '') && (line.from === id || line.to === id)).map((line, index) => { const nodeId = line.from === id ? line.to : line.from, node = map.get(nodeId), type = line.data?.type || 'RELATED'; return { key: `${line.from}-${line.to}-${type}-${index}`, nodeId, nodeText: node?.text || nodeId, label: relationLabel(type), color: KG_RELATION_COLORS[type] || '#94a3b8' } }) })

function nodeTypeLabel(type: unknown) { return TYPE_LABELS[String(type || '')] || String(type || '节点') }
function relationLabel(type: string) { return RELATION_LABELS[type] || type.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') }
function shortLabel(node: KGGraphNode) { if (node.data?.type === 'Topic') return 'Topic'; if (node.data?.type === 'Paper') { const words = node.text.split(/\s+/).filter(Boolean); return words.slice(0, 2).join(' ') || 'Paper' } return node.text.length > 12 ? `${node.text.slice(0, 11)}…` : node.text }
function asNode(node: unknown) { return node as RGNode }
function graphNodeId(node: unknown) { return asNode(node).id }
function graphNodeLabel(node: unknown) { return String(asNode(node).data?.shortLabel || asNode(node).text || 'Node') }
function graphNodeMeta(node: unknown) { return String(asNode(node).data?.nodeTypeLabel || '节点') }
function nodeStyle(node: unknown): Record<string, string> { const graphNode = asNode(node), size = Number(graphNode.data?.size || 44), color = String(graphNode.data?.nodeColor || '#64748b'); return { width: `${size}px`, height: `${size}px`, backgroundColor: color, '--node-color': color } }

async function loadTopic() {
  const topic = topicQuery.value.trim(); if (!topic) { error.value = '请输入需要探索的 Topic。'; return }
  const sequence = ++requestSequence; loading.value = true; error.value = ''; expandError.value = ''; currentTopic.value = topic; selectedNode.value = null; expandedPaperIds.value = new Set()
  try { const graph = await fetchTopicSeedGraph(topic, 20); if (sequence !== requestSequence) return; rawGraphData.value = graph; activeRelations.value = [...new Set(graph.lines.map(line => line.data?.type).filter(Boolean))]; selectedNode.value = graph.nodes.find(node => node.id === graph.rootId) || null; await nextTick(); refreshGraph(true); router.replace({ name: 'topic-graph', query: { topic } }) }
  catch (cause) { if (sequence !== requestSequence) return; rawGraphData.value = { rootId: '', nodes: [], lines: [] }; error.value = cause instanceof Error ? cause.message : 'Topic 图谱加载失败' }
  finally { if (sequence === requestSequence) loading.value = false }
}
function useSuggestion(value: string) { topicQuery.value = value; void loadTopic() }
function selectAllRelations() { activeRelations.value = availableRelations.value.map(item => item.type); refreshGraph(true) }
function onNodeClick(node: RGNode, _event: RGUserEvent) { selectNode(node.id); return true }
function selectNode(id: string) { const source = rawGraphData.value.nodes.find(node => node.id === id); if (!source) return; selectedNode.value = source; expandError.value = ''; refreshGraph(false); relationGraph$.value?.getInstance()?.focusNodeById(id) }
function mergeGraph(graph: KGGraphData) { const nodeMap = new Map(rawGraphData.value.nodes.map(node => [node.id, node] as const)); for (const node of graph.nodes) { const old = nodeMap.get(node.id); nodeMap.set(node.id, old ? { ...old, ...node, data: { ...old.data, ...node.data } } : node) } const lineMap = new Map(rawGraphData.value.lines.map(line => [`${line.from}|${line.to}|${line.data?.type}`, line] as const)); for (const line of graph.lines) lineMap.set(`${line.from}|${line.to}|${line.data?.type}`, line); rawGraphData.value = { rootId: rawGraphData.value.rootId, nodes: [...nodeMap.values()], lines: [...lineMap.values()] }; activeRelations.value = [...new Set([...activeRelations.value, ...graph.lines.map(line => line.data?.type).filter(Boolean)])] }
async function expandSelectedPaper() { const node = selectedNode.value; if (!node || node.data?.type !== 'Paper') return; expandingPaperId.value = node.id; expandError.value = ''; try { const graph = await kg.graph(node.id, Math.max(1, graphDepth.value - 1)); mergeGraph(graph); expandedPaperIds.value = new Set([...expandedPaperIds.value, node.id]); selectedNode.value = rawGraphData.value.nodes.find(item => item.id === node.id) || node; await nextTick(); refreshGraph(true) } catch (cause) { expandError.value = cause instanceof Error ? cause.message : '论文关系展开失败' } finally { expandingPaperId.value = '' } }
function openPaperGraph(paperId: string) { router.push({ name: 'paper-graph', params: { paperId }, query: { title: selectedNode.value?.text || '' } }) }
function refreshGraph(reLayout: boolean) { const component = relationGraph$.value; if (!component) return; component.setJsonData(displayGraphData.value, reLayout, async instance => { if (reLayout) await instance.zoomToFit() }) }
async function fitGraph() { await relationGraph$.value?.getInstance()?.zoomToFit() }
async function changeLayout(layout: LayoutMode) { currentLayout.value = layout; const instance = relationGraph$.value?.getInstance(); if (!instance) return; await instance.switchLayout(graphLayout(layout, displayGraphData.value.nodes.length), true, true); await instance.zoomToFit() }

onMounted(() => { const topic = typeof route.query.topic === 'string' ? route.query.topic : ''; if (topic) { topicQuery.value = topic; void loadTopic() } else refreshGraph(true) })
onBeforeUnmount(() => { requestSequence += 1 })
</script>

<style scoped>
.topic-workbench{--primary:#002fa7;--primary-soft:#e9eefb;--bg:#f7f8fc;--ink:#0f1419;--ink-2:#374151;--muted:#6b7280;--faint:#9ca3af;--line:#e5e7eb;display:flex;width:100%;height:100%;min-height:620px;flex-direction:column;overflow:hidden;border:1px solid var(--line);border-radius:14px;background:var(--bg);color:var(--ink);box-shadow:0 2px 6px #1f29370d}
.workbench-header{display:grid;min-height:60px;flex:0 0 auto;grid-template-columns:minmax(180px,.8fr) minmax(180px,1.2fr) auto;align-items:center;gap:16px;padding:0 18px;border-bottom:1px solid var(--line);background:#fff}.header-title h1{margin:0;font-size:15px}.header-title p{margin:3px 0 0;color:var(--faint);font-size:10px}.current-topic{overflow:hidden;color:var(--ink);font-size:13px;font-weight:650;text-align:center;text-overflow:ellipsis;white-space:nowrap}.header-actions,.layout-tabs,.graph-limits{display:flex;align-items:center;gap:5px}.layout-tabs,.graph-limits{padding:3px;border:1px solid var(--line);border-radius:9px;background:var(--bg)}.layout-tabs span,.graph-limits>span{padding:0 5px;color:var(--faint);font-size:9px}.layout-tabs button{height:25px;padding:0 8px;color:var(--muted);background:transparent;border:0;border-radius:6px;font-size:10px;cursor:pointer}.layout-tabs button.active{color:var(--primary);background:#fff;box-shadow:0 1px 4px #1f293717}.graph-limits label{display:flex;align-items:center;gap:3px;color:var(--faint);font-size:10px}.graph-limits select{height:25px;color:var(--ink-2);background:#fff;border:0;border-radius:6px}.icon-button{display:grid;width:32px;height:32px;place-items:center;color:var(--muted);background:#fff;border:1px solid var(--line);border-radius:9px;cursor:pointer}
.workbench-body{display:grid;min-height:0;flex:1;grid-template-columns:280px minmax(420px,1fr) 330px}.control-panel,.detail-panel{min-width:0;background:#fff}.control-panel{display:flex;min-height:0;flex-direction:column;border-right:1px solid var(--line);overflow-y:auto}.topic-search{padding:16px;border-bottom:1px solid var(--line)}.topic-search>label{display:block;margin-bottom:8px;color:var(--ink-2);font-size:11px;font-weight:700}.search-input{display:flex;height:38px;align-items:center;padding-left:10px;border:1px solid var(--line);border-radius:10px}.search-input>.el-icon{color:var(--primary)}.search-input input{min-width:0;flex:1;padding:0 8px;border:0;outline:0}.search-input button{align-self:stretch;padding:0 12px;color:#fff;background:var(--primary);border:0;border-radius:0 9px 9px 0;cursor:pointer}.suggestions{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.suggestions button{padding:4px 7px;color:#52657f;background:#f3f6fb;border:0;border-radius:6px;font-size:9px;cursor:pointer}.filter-section,.paper-section{padding:15px;border-bottom:1px solid var(--line)}.section-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:var(--ink-2);font-size:11px}.section-heading button{color:var(--primary);background:none;border:0;font-size:10px;cursor:pointer}.section-heading>span{color:var(--faint)}.relation-option{display:grid;grid-template-columns:16px 8px 1fr auto;align-items:center;gap:8px;padding:7px 2px;color:var(--muted);font-size:11px;cursor:pointer}.relation-option input{accent-color:var(--primary)}.relation-option i{width:7px;height:7px;border-radius:50%}.relation-option small{color:var(--faint)}.paper-section{min-height:0;flex:1}.paper-list{display:flex;flex-direction:column;gap:3px}.paper-list button{padding:9px 10px;color:var(--ink-2);background:transparent;border:0;border-radius:8px;text-align:left;cursor:pointer}.paper-list button:hover,.paper-list button.active{background:var(--primary-soft)}.paper-list button.active strong{color:var(--primary)}.paper-list strong,.paper-list span{display:block}.paper-list strong{overflow:hidden;font-size:11px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.paper-list span{margin-top:4px;color:var(--faint);font-size:9px}
.graph-panel{position:relative;min-width:0;min-height:0;overflow:hidden;background:var(--bg)}.relation-graph{width:100%;height:100%}.graph-node{position:relative;display:flex;box-sizing:border-box;align-items:center;justify-content:center;border:2px solid #fff;border-radius:50%;color:#fff;cursor:pointer;box-shadow:0 3px 9px #0f172a33;transition:.16s}.graph-node:hover{transform:scale(1.05)}.graph-node.center{box-shadow:0 0 0 3px var(--primary),0 6px 18px #002fa738}.graph-node.selected{box-shadow:0 0 0 3px #5b21b6,0 5px 16px #5b21b633}.node-label{position:absolute;top:calc(100% + 7px);left:50%;width:126px;overflow:hidden;transform:translateX(-50%);color:var(--ink-2);font-size:10px;font-weight:650;text-align:center;text-overflow:ellipsis;white-space:nowrap}.node-meta{font-size:9px;font-weight:650}.canvas-overlay{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#f7f8fcf2;color:var(--faint);text-align:center}.canvas-overlay strong{margin-top:13px;color:var(--ink-2);font-size:14px}.canvas-overlay p{max-width:420px;margin:6px 20px 0;font-size:11px;line-height:1.6}.loading-ring{width:28px;height:28px;border:3px solid var(--primary-soft);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error-state button{display:flex;align-items:center;gap:5px;margin-top:14px;padding:9px 14px;color:#fff;background:var(--primary);border:0;border-radius:8px;cursor:pointer}.empty-visual{position:relative;width:116px;height:58px}.empty-visual:before,.empty-visual:after{position:absolute;top:27px;width:46px;height:1px;background:#ccd5ed;content:''}.empty-visual:before{left:17px;transform:rotate(-17deg)}.empty-visual:after{right:17px;transform:rotate(17deg)}.empty-visual span{position:absolute;z-index:1;width:22px;height:22px;border:2px solid #fff;border-radius:50%;background:#002fa78c}.empty-visual span:first-child{left:0;bottom:2px}.empty-visual span:nth-child(2){left:47px;top:0;width:28px;height:28px;background:var(--primary)}.empty-visual span:last-child{right:0;bottom:2px}.canvas-legend{position:absolute;right:14px;bottom:12px;left:14px;z-index:3;display:flex;justify-content:center;flex-wrap:wrap;gap:12px;color:var(--faint);font-size:9px;pointer-events:none}.canvas-legend span{display:flex;align-items:center;gap:4px}.canvas-legend i{width:7px;height:7px;border-radius:50%}
.detail-panel{min-height:0;border-left:1px solid var(--line);overflow:hidden}.detail-heading{display:flex;min-height:52px;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--line);font-size:12px}.detail-heading span{padding:3px 8px;color:var(--primary);background:var(--primary-soft);border-radius:999px;font-size:9px}.detail-content{height:calc(100% - 52px);box-sizing:border-box;padding:20px;overflow-y:auto}.page-eyebrow{margin:0;color:var(--primary);font-size:10px;font-weight:750;letter-spacing:.1em}.detail-content h2{margin:8px 0 12px;color:var(--ink);font-size:19px;line-height:1.4}.description{color:var(--muted);font-size:12px;line-height:1.75}.detail-content dl{display:grid;grid-template-columns:68px 1fr;gap:9px;margin:18px 0 0;padding-top:16px;border-top:1px solid var(--line);font-size:11px}.detail-content dt{color:var(--faint)}.detail-content dd{margin:0;color:var(--ink-2);word-break:break-word}.connections{margin-top:20px;padding-top:17px;border-top:1px solid var(--line)}.detail-section-title{display:flex;justify-content:space-between;color:var(--ink-2);font-size:11px}.detail-section-title span,.connections>p{color:var(--faint)}.connection-list{display:flex;flex-direction:column;gap:4px;margin-top:10px}.connection-list button{display:grid;grid-template-columns:8px 1fr;align-items:center;gap:8px;padding:8px;color:var(--ink-2);background:#f9fafb;border:0;border-radius:8px;text-align:left;cursor:pointer}.connection-list i{width:7px;height:7px;border-radius:50%}.connection-list b,.connection-list small{display:block}.connection-list b{font-size:9px}.connection-list small{max-width:225px;margin-top:2px;overflow:hidden;color:var(--muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:20px;padding-top:17px;border-top:1px solid var(--line)}.detail-actions button{height:34px;border-radius:8px;font-size:10px;cursor:pointer}.primary-action{color:#fff;background:var(--primary);border:1px solid var(--primary)}.secondary-action{color:var(--primary);background:#fff;border:1px solid #cbd6ed}.detail-actions p{grid-column:1/-1;margin:0;color:var(--faint);font-size:9px;line-height:1.5}.detail-actions .expand-error{color:#dc2626}.detail-empty{display:flex;height:100%;align-items:center;justify-content:center;flex-direction:column;color:var(--faint);text-align:center}.detail-empty>span{color:var(--primary);font-size:34px}.detail-empty strong{margin-top:8px;color:var(--ink-2);font-size:12px}.detail-empty p{margin:6px 0;font-size:10px}
@media(max-width:1180px){.workbench-body{grid-template-columns:250px minmax(390px,1fr) 300px}.layout-tabs>span{display:none}.graph-limits>span{display:none}}@media(max-width:920px){.topic-workbench{height:auto;min-height:900px;overflow:visible}.workbench-header{grid-template-columns:1fr auto}.current-topic{display:none}.workbench-body{grid-template-columns:240px minmax(480px,1fr);grid-template-rows:620px 420px;overflow-x:auto}.detail-panel{grid-column:1/-1;border-top:1px solid var(--line);border-left:0}}
</style>
