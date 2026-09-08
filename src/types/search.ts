export type ResourceKind = 'paper' | 'patent' | 'scholar' | 'project' | 'fund'

export interface ResourceSearchItem {
  id: string
  type: ResourceKind
  title: string
  summary: string
  meta: string[]
  paperId?: string
}

export type ResourceSearchGroups = Record<ResourceKind, ResourceSearchItem[]>

