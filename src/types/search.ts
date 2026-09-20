export type ResourceKind = 'paper' | 'patent' | 'scholar' | 'projectFund'

export interface ResourceSearchItem {
  id: string
  type: ResourceKind
  title: string
  summary: string
  meta: string[]
  paperId?: string
  year?: number
  score?: number
}

export type ResourceSearchGroups = Record<ResourceKind, ResourceSearchItem[]>
