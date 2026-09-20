import { ApiError, request } from "./request";

export interface RetrievalPaper {
  paper_id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number;
  /** 实际后端当前返回 conference；venue 用于兼容早期联调文档。 */
  conference?: string;
  venue?: string;
  keywords?: string[];
  subjects?: string[];
  score?: number;
  rank?: number;
  retrieval_mode?: string;
}

export interface RetrievalState {
  query?: string;
  executed_operations: string[];
  failed_operations: string[];
}

export interface RetrievalSearchResponse {
  results: RetrievalPaper[];
  state: RetrievalState;
}

export interface RetrievalSearchParams {
  query: string;
  top_k?: number;
  year_gte?: number;
  year_lte?: number;
  conference?: string[];
  author?: string[];
  keyword?: string[];
  subject?: string[];
}

export interface RetrievalHealthResponse {
  status: string;
  components?: string[];
  lexical?: {
    status?: string;
    backend?: string;
    paper_count?: number;
    db_path?: string;
  } | null;
  graph?: unknown;
  dense?: unknown;
}

const EMPTY_STATE: RetrievalState = {
  executed_operations: [],
  failed_operations: [],
};

/** 读取新检索后端健康状态及其当前可检索论文数量。 */
export async function fetchRetrievalHealth(
  signal?: AbortSignal,
): Promise<RetrievalHealthResponse> {
  return request<RetrievalHealthResponse>("/api/retrieval/health", { signal });
}

/** 调用新检索后端。其他会议、论文分页及图谱接口仍由旧服务负责。 */
export async function searchRetrievalPapers(
  params: RetrievalSearchParams,
  signal?: AbortSignal,
): Promise<RetrievalSearchResponse> {
  const query = params.query.trim();
  if (!query) return { results: [], state: { ...EMPTY_STATE } };

  let data: RetrievalSearchResponse;
  try {
    data = await request<RetrievalSearchResponse>("/api/retrieval/search", {
      method: "POST",
      signal,
      body: {
        query,
        top_k: params.top_k ?? 20,
        year_gte: params.year_gte,
        year_lte: params.year_lte,
        conference: params.conference?.length ? params.conference : undefined,
        author: params.author?.length ? params.author : undefined,
        keyword: params.keyword?.length ? params.keyword : undefined,
        subject: params.subject?.length ? params.subject : undefined,
      },
    });
  } catch (error) {
    if (import.meta.env.DEV && error instanceof ApiError && error.status >= 500) {
      throw new Error("无法连接新检索服务，请确认 SSH 隧道窗口仍在运行后重试");
    }
    throw error;
  }

  return {
    results: Array.isArray(data.results) ? data.results : [],
    state: {
      executed_operations: data.state?.executed_operations ?? [],
      failed_operations: data.state?.failed_operations ?? [],
    },
  };
}
