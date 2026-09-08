/**
 * 知识图谱 API 调用
 * 类型从 types/kg.ts 收口；dev fallback 仅在开发环境生效
 */
import { ApiError, request } from "./request";
import { searchRetrievalPapers } from "./retrieval";
import {
  KG_NODE_COLORS,
  KG_RELATION_COLORS,
  type KGNodeType,
  type KGGraphNode,
  type KGGraphLine,
  type KGGraphData,
  type PaperSearchHit,
  type PaperDetail,
} from "../types/kg";

// 重新导出类型与常量，保持原有 import 路径兼容
export { KG_NODE_COLORS, KG_RELATION_COLORS };
export type { KGNodeType, KGGraphNode, KGGraphLine, KGGraphData, PaperSearchHit, PaperDetail };

const API_BASE = "/api/kg";

export async function searchPapers(q: string, limit = 20, signal?: AbortSignal): Promise<PaperSearchHit[]> {
  if (!q.trim()) return [];
  const data = await searchRetrievalPapers({ query: q, top_k: limit }, signal);
  if (data.state.failed_operations.length) {
    console.warn("[Retrieval] 部分检索操作失败：", data.state.failed_operations);
  }
  return data.results.map((paper) => ({
    paper_id: paper.paper_id,
    title: paper.title || "",
    abstract: paper.abstract || "",
    authors: Array.isArray(paper.authors) ? paper.authors : [],
    year: Number(paper.year || 0),
    venue: paper.venue || paper.conference || "",
    keywords: paper.keywords || [],
  }));
}

export async function fetchGraphByPaper(paperId: string, depth = 2, signal?: AbortSignal): Promise<KGGraphData> {
  return request<KGGraphData>(
    `/api/kg/graph?paperId=${encodeURIComponent(paperId)}&depth=${depth}`,
    { signal }
  );
}

export async function fetchPaperDetail(paperId: string, signal?: AbortSignal): Promise<PaperDetail> {
  return request<PaperDetail>(`/kg/paper?paperId=${encodeURIComponent(paperId)}`, { signal });
}

/* ============================================================
 * 开发回退层：API 不可用时用本地 JSON + OpenAlex 引用数据
 * 仅在 import.meta.env.DEV 下生效，生产构建会被 tree-shake 剔除
 * ============================================================ */
let _devData: KGGraphData | null = null;

async function devLoadData(): Promise<KGGraphData> {
  if (_devData) return _devData;
  // 大 JSON 已外迁到 public/kg-data/，避免进入 Vite bundle
  const res = await fetch("/kg-data/paper_kg_graph.json");
  const data = JSON.parse(JSON.stringify(await res.json())) as KGGraphData;

  try {
    const citesRes = await fetch("/kg-data/cites_from_openalex.json");
    const citesData = await citesRes.json();
    const existingIds = new Set(data.nodes.map((n) => n.id));
    for (const n of citesData.newNodes || []) {
      if (!existingIds.has(n.id)) {
        data.nodes.push(n);
        existingIds.add(n.id);
      }
    }
    const edgeKeys = new Set(data.lines.map((l) => `${l.from}|||${l.to}`));
    for (const l of citesData.lines || []) {
      const key = `${l.from}|||${l.to}`;
      if (!edgeKeys.has(key)) {
        data.lines.push(l);
        edgeKeys.add(key);
      }
    }
  } catch {
    /* cites file not available, continue with demo data only */
  }

  _devData = data;
  return _devData;
}

async function devSearchPapers(q: string): Promise<PaperSearchHit[]> {
  const data = await devLoadData();
  const ql = q.toLowerCase();
  return data.nodes
    .filter((n) => n.data?.type === "Paper" && n.text.toLowerCase().includes(ql))
    .map((n) => ({
      paper_id: n.id,
      title: n.text,
      authors: n.data?.authors || [],
      year: n.data?.year || 0,
      venue: n.data?.venue || "",
      abstract: n.data?.abstract || n.data?.description || "",
      doi: n.data?.doi,
      pdf_url: n.data?.pdf_url,
    }))
    .slice(0, 20);
}

function devPaperDetailFromNode(node: KGGraphNode, data: KGGraphData): PaperDetail {
  const citations = data.lines.filter((line) => line.data?.type === "CITES" && line.to === node.id).length;
  const references = data.lines.filter((line) => line.data?.type === "CITES" && line.from === node.id).length;
  const keywordIds = data.lines
    .filter((line) => line.data?.type === "HAS_KEYWORD" && line.from === node.id)
    .map((line) => line.to);
  const keywords = keywordIds
    .map((id) => data.nodes.find((candidate) => candidate.id === id)?.text || "")
    .filter(Boolean);

  return {
    paper_id: node.id,
    title: node.text,
    authors: node.data?.authors || [],
    year: node.data?.year || 0,
    venue: node.data?.venue || "",
    abstract: node.data?.abstract || node.data?.description || "",
    doi: node.data?.doi,
    pdf_url: node.data?.pdf_url,
    citationCount: node.data?.citeCount ?? citations,
    referenceCount: references,
    keywords: node.data?.keywords?.length ? node.data.keywords : keywords,
    externalUrl: node.data?.doi?.startsWith("http") ? node.data.doi : undefined,
  };
}

async function devFetchPaperDetail(paperId: string): Promise<PaperDetail> {
  const data = await devLoadData();
  const node = data.nodes.find((candidate) => candidate.id === paperId && candidate.data?.type === "Paper");
  if (!node) throw new Error("未找到该论文");
  return devPaperDetailFromNode(node, data);
}

/** 带 fallback 的工厂，页面直接调用 */
export const kg = {
  async search(q: string, signal?: AbortSignal): Promise<{ results: PaperSearchHit[]; isApi: boolean }> {
    try {
      const r = await searchPapers(q, 20, signal);
      return { results: r, isApi: true };
    } catch {
      if (import.meta.env.DEV) {
        const r = await devSearchPapers(q);
        return { results: r, isApi: false };
      }
      throw new Error("知识图谱搜索服务暂不可用");
    }
  },
  /**
   * 新图谱接口。这里不再回退 public/kg-data，确保画布展示的是真实后端数据。
   */
  async graph(paperId: string, depth = 2, signal?: AbortSignal): Promise<KGGraphData> {
    try {
      return await fetchGraphByPaper(paperId, depth, signal);
    } catch (error) {
      console.error("[KG] 新图谱接口调用失败", error);
      if (error instanceof ApiError && error.status === 404) {
        throw new Error("图谱接口不存在（404），请确认图谱服务端口和 /api/kg/graph 路由");
      }
      if (error instanceof ApiError && error.status === 0) {
        throw new Error("无法连接图谱服务，请检查公网图谱接口或 Vite 代理配置");
      }
      throw error instanceof Error ? error : new Error("图谱接口加载失败，请稍后重试");
    }
  },
  async detail(paperId: string, signal?: AbortSignal): Promise<PaperDetail> {
    try {
      const detail = await fetchPaperDetail(paperId, signal);
      return {
        ...detail,
        citationCount: Number(detail.citationCount || 0),
        referenceCount: Number(detail.referenceCount || 0),
        keywords: detail.keywords || [],
      };
    } catch {
      if (import.meta.env.DEV) return devFetchPaperDetail(paperId);
      throw new Error("论文详情加载失败，请稍后重试");
    }
  },
};

export { API_BASE };
