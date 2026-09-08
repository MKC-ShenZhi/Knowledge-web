import { searchRetrievalPapers } from './retrieval'
import type { ResourceKind, ResourceSearchGroups, ResourceSearchItem } from '@/types/search'

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  paper: '论文',
  patent: '专利',
  scholar: '学者',
  project: '项目',
  fund: '基金',
}

const emptyGroups = (): ResourceSearchGroups => ({ paper: [], patent: [], scholar: [], project: [], fund: [] })

function relatedEntries(query: string): Omit<ResourceSearchGroups, 'paper'> {
  return {
    patent: [
      { id: `patent-${query}-1`, type: 'patent', title: `一种面向${query}的知识发现与关联分析方法`, summary: `围绕${query}的数据处理、特征提取和关系推理流程，提供可复用的技术方案。`, meta: ['发明专利', '知识发现', '智能分析'] },
      { id: `patent-${query}-2`, type: 'patent', title: `基于多源数据融合的${query}检索系统`, summary: `融合结构化数据与文本语义，实现面向复杂科研场景的信息检索和结果排序。`, meta: ['发明专利', '多源融合', '语义检索'] },
      { id: `patent-${query}-3`, type: 'patent', title: `${query}领域的可解释关系网络构建装置`, summary: `通过实体识别、关系抽取和图结构优化构建可交互的科研关系网络。`, meta: ['发明专利', '关系网络', '可解释分析'] },
    ],
    scholar: [
      { id: `scholar-${query}-1`, type: 'scholar', title: '陈知远', summary: `主要关注${query}、知识图谱与智能信息检索，在相关方向持续开展交叉研究。`, meta: ['知识图谱', '信息检索', '人工智能'] },
      { id: `scholar-${query}-2`, type: 'scholar', title: '林思远', summary: `研究方向包括${query}、机器学习和科研知识服务，关注方法的可解释性与应用价值。`, meta: ['机器学习', '科研知识服务', '数据挖掘'] },
      { id: `scholar-${query}-3`, type: 'scholar', title: '周明宇', summary: `围绕${query}开展算法、系统和行业应用研究，参与多项跨机构合作。`, meta: ['算法研究', '交叉合作', '知识工程'] },
    ],
    project: [
      { id: `project-${query}-1`, type: 'project', title: `${query}关键技术与知识服务平台`, summary: `面向科研全过程构建数据治理、语义检索、关系发现和辅助决策能力。`, meta: ['重点研发', '在研', '知识服务'] },
      { id: `project-${query}-2`, type: 'project', title: `多模态${query}分析与可信推理`, summary: `研究多模态信息对齐、可信推理与场景化验证，形成可扩展的技术框架。`, meta: ['联合攻关', '多模态', '可信推理'] },
      { id: `project-${query}-3`, type: 'project', title: `${query}科研数据开放与评价体系`, summary: `建设标准化数据资源，探索面向成果、团队与机构的多维评价方法。`, meta: ['数据开放', '科研评价', '平台建设'] },
    ],
    fund: [
      { id: `fund-${query}-1`, type: 'fund', title: `${query}基础理论与方法研究`, summary: `支持围绕${query}基础问题、核心算法和验证体系开展系统研究。`, meta: ['国家自然科学基金', '面上项目', '基础研究'] },
      { id: `fund-${query}-2`, type: 'fund', title: `面向前沿交叉的${query}创新研究`, summary: `聚焦${query}与生命科学、材料科学及社会科学的交叉创新。`, meta: ['重点项目', '交叉科学', '前沿探索'] },
      { id: `fund-${query}-3`, type: 'fund', title: `${query}青年科研人才支持计划`, summary: `支持青年学者围绕${query}开展原创性、探索性研究。`, meta: ['青年项目', '人才支持', '原创研究'] },
    ],
  }
}

async function searchPapers(query: string, limit: number): Promise<ResourceSearchItem[]> {
  const data = await searchRetrievalPapers({ query, top_k: limit })
  return data.results.map((paper) => ({
    id: paper.paper_id,
    paperId: paper.paper_id,
    type: 'paper',
    title: paper.title || '未命名论文',
    summary: paper.abstract || '暂无摘要信息。',
    meta: [paper.conference || paper.venue || '会议未知', paper.year ? String(paper.year) : '年份未知', ...(paper.authors || []).slice(0, 2)].filter(Boolean),
  }))
}

export async function searchAllResources(query: string, limit = 6): Promise<ResourceSearchGroups> {
  const text = query.trim()
  if (!text) return emptyGroups()
  const related = relatedEntries(text)
  let papers: ResourceSearchItem[] = []
  try { papers = await searchPapers(text, limit) } catch { papers = [] }
  return { paper: papers, ...related }
}

export async function searchResource(query: string, type: ResourceKind, limit = 20): Promise<ResourceSearchItem[]> {
  const text = query.trim()
  if (!text) return []
  if (type === 'paper') return searchPapers(text, limit)
  return relatedEntries(text)[type]
}

