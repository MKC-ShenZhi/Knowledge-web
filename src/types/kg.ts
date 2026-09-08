/**
 * 知识图谱统一类型定义
 * 从 services/kg.ts 收口到此，避免类型散落
 */

export type KGNodeType =
  | "Paper"
  | "Author"
  | "Venue"
  | "ConferenceEdition"
  | "Keyword"
  | "Subject"
  | "Year"
  | "Institution"
  | "Method"
  | "Fund"
  | "Project"
  | "Patent";

export const KG_NODE_COLORS: Record<KGNodeType, { color: string; borderColor: string }> = {
  Paper:             { color: "#3b82f6", borderColor: "#93c5fd" },
  Author:            { color: "#10b981", borderColor: "#6ee7b7" },
  Venue:             { color: "#ef4444", borderColor: "#fca5a5" },
  ConferenceEdition: { color: "#f87171", borderColor: "#fca5a5" },
  Keyword:           { color: "#8b5cf6", borderColor: "#c4b5fd" },
  Subject:           { color: "#8b5cf6", borderColor: "#c4b5fd" },
  Year:              { color: "#6b7280", borderColor: "#d1d5db" },
  Institution:       { color: "#0f766e", borderColor: "#5eead4" },
  Method:            { color: "#c2410c", borderColor: "#fdba74" },
  Fund:              { color: "#b45309", borderColor: "#fcd34d" },
  Project:           { color: "#0369a1", borderColor: "#7dd3fc" },
  Patent:            { color: "#be123c", borderColor: "#fda4af" },
};

export const KG_RELATION_COLORS: Record<string, string> = {
  AUTHORED_BY:    "#10b981",
  PUBLISHED_IN:   "#ef4444",
  PUBLISHED_YEAR: "#94a3b8",
  HAS_KEYWORD:    "#8b5cf6",
  HAS_SUBJECT:    "#8b5cf6",
  BELONGS_TO:     "#fca5a5",
  CITES:          "#64748b",
};

export interface KGGraphNode {
  id: string;
  text: string;
  color: string;
  borderColor: string;
  fontColor?: string;
  data: {
    type: KGNodeType;
    description: string;
    labels: string[];
    image?: string;
    img_path?: string;
    size?: number;
    year?: number;
    venue?: string;
    abstract?: string;
    authors?: string[];
    doi?: string;
    pdf_url?: string;
    citeCount?: number;
    keywords?: string[];
    name?: string;
    institution?: string;
    project?: string;
    fund?: string;
    method?: string;
    [key: string]: unknown;
  };
}

export interface KGGraphLine {
  from: string;
  to: string;
  text: string;
  color: string;
  data: {
    type: string;
    fromText: string;
    toText: string;
    description: string;
    weight?: number;
    source_file?: string[];
  };
}

export interface KGGraphData {
  rootId: string;
  nodes: KGGraphNode[];
  lines: KGGraphLine[];
}

export interface PaperSearchHit {
  paper_id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  abstract: string;
  doi?: string;
  pdf_url?: string;
  citationCount?: number;
  referenceCount?: number;
  keywords?: string[];
}

/** 右侧详情面板使用的完整论文模型，不与图组件内部节点类型耦合。 */
export interface PaperDetail extends PaperSearchHit {
  citationCount: number;
  referenceCount: number;
  keywords: string[];
  externalUrl?: string;
}

export type RelatedPaperDirection = "reference" | "citation" | "both";

/** 左侧相关论文列表项。 */
export interface RelatedPaperItem extends PaperDetail {
  relationDirection: RelatedPaperDirection;
}
