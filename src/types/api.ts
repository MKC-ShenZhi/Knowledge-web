export interface Paper {
  paper_id: string
  title: string
  authors: string[]
  year: number
  conference: string
  abstract: string
  doi: string
  pdf_url: string
  keywords: string[]
}

export interface ApiResponse<T> {
  data: T[]
  total: number
  page?: number
  pageSize?: number
}

export interface KgNode {
  id: string
  data: {
    title: string
    year: number
    venue: string
    citeCount?: number
    size?: number
  }
  x?: number
  y?: number
}

export interface KgLine {
  from: string
  to: string
  data: {
    type: string
  }
}

export interface KgGraph {
  rootId: string
  nodes: KgNode[]
  lines: KgLine[]
}

export interface Conference {
  conference: string
  count: number
  minYear: number
  maxYear: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    username: string
    role: string
  }
}
