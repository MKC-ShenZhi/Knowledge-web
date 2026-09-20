import { searchRetrievalPapers } from './retrieval'
import {
  KG_NODE_COLORS,
  KG_RELATION_COLORS,
  type KGGraphData,
  type KGGraphLine,
  type KGGraphNode,
  type KGNodeType,
} from '@/types/kg'

function entityId(type: string, value: string): string {
  return `${type.toLowerCase()}:${encodeURIComponent(value.trim().toLowerCase())}`
}

function makeNode(id: string, text: string, type: KGNodeType, data: Record<string, unknown> = {}): KGGraphNode {
  const palette = KG_NODE_COLORS[type]
  return {
    id,
    text,
    color: palette.color,
    borderColor: palette.borderColor,
    data: {
      type,
      description: '',
      labels: [type],
      ...data,
    },
  }
}

function makeLine(from: string, to: string, type: string, fromText: string, toText: string): KGGraphLine {
  return {
    from,
    to,
    text: type,
    color: KG_RELATION_COLORS[type] || '#94a3b8',
    data: {
      type,
      fromText,
      toText,
      description: `${fromText} → ${toText}`,
    },
  }
}

/**
 * 现有后端尚无 Topic 专用图谱接口，因此使用真实检索结果及论文元数据
 * 构造 Topic 中心首屏；论文节点的更深关系由 /api/kg/graph 按需展开。
 */
export async function fetchTopicSeedGraph(topic: string, limit = 20, signal?: AbortSignal): Promise<KGGraphData> {
  const normalizedTopic = topic.trim()
  if (!normalizedTopic) return { rootId: '', nodes: [], lines: [] }

  const response = await searchRetrievalPapers({ query: normalizedTopic, top_k: limit }, signal)
  const rootId = entityId('topic', normalizedTopic)
  const nodeMap = new Map<string, KGGraphNode>()
  const lineMap = new Map<string, KGGraphLine>()

  const addNode = (node: KGGraphNode) => {
    if (!nodeMap.has(node.id)) nodeMap.set(node.id, node)
  }
  const addLine = (line: KGGraphLine) => {
    const key = `${line.from}|${line.to}|${line.data.type}`
    if (!lineMap.has(key)) lineMap.set(key, line)
  }

  addNode(makeNode(rootId, normalizedTopic, 'Topic', {
    name: normalizedTopic,
    description: `围绕“${normalizedTopic}”聚合的研究主题，共召回 ${response.results.length} 篇相关论文。`,
    resultCount: response.results.length,
  }))

  for (const paper of response.results) {
    const paperId = paper.paper_id
    const venue = paper.venue || paper.conference || ''
    addNode(makeNode(paperId, paper.title || '未命名论文', 'Paper', {
      abstract: paper.abstract || '',
      authors: Array.isArray(paper.authors) ? paper.authors : [],
      year: Number(paper.year || 0),
      venue,
      keywords: paper.keywords || [],
      subjects: paper.subjects || [],
      score: paper.score,
      rank: paper.rank,
      description: paper.abstract || '',
    }))
    addLine(makeLine(rootId, paperId, 'HAS_PAPER', normalizedTopic, paper.title || '未命名论文'))

    for (const author of (paper.authors || []).slice(0, 4)) {
      if (!author.trim()) continue
      const id = entityId('author', author)
      addNode(makeNode(id, author, 'Author', { name: author }))
      addLine(makeLine(paperId, id, 'AUTHORED_BY', paper.title, author))
    }

    if (venue) {
      const id = entityId('venue', venue)
      addNode(makeNode(id, venue, 'Venue', { name: venue }))
      addLine(makeLine(paperId, id, 'PUBLISHED_IN', paper.title, venue))
    }

    if (paper.year) {
      const yearText = String(paper.year)
      const id = entityId('year', yearText)
      addNode(makeNode(id, yearText, 'Year', { year: paper.year }))
      addLine(makeLine(paperId, id, 'PUBLISHED_YEAR', paper.title, yearText))
    }

    for (const keyword of (paper.keywords || []).slice(0, 4)) {
      if (!keyword.trim()) continue
      const id = entityId('keyword', keyword)
      addNode(makeNode(id, keyword, 'Keyword', { name: keyword }))
      addLine(makeLine(paperId, id, 'HAS_KEYWORD', paper.title, keyword))
    }

    for (const subject of (paper.subjects || []).slice(0, 3)) {
      if (!subject.trim()) continue
      const id = entityId('subject', subject)
      addNode(makeNode(id, subject, 'Subject', { name: subject }))
      addLine(makeLine(paperId, id, 'HAS_SUBJECT', paper.title, subject))
    }
  }

  return { rootId, nodes: [...nodeMap.values()], lines: [...lineMap.values()] }
}
