export type NodeType = 'text' | 'image' | 'audio' | 'list' | 'code' | 'link'

export interface BoardNode {
  id: string
  type: NodeType
  x: number
  y: number
  width: number
  height: number
  color: string
  content: string
  items?: string[]
  imageUrl?: string
  audioUrl?: string
  transcript?: string
  code?: string
  language?: string
  linkUrl?: string
  author: string
  createdAt: number
  parentId: string | null
  refined: string | null
  _z?: number
  _autoEdit?: boolean
  _isRefining?: boolean
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export const NODE_COLORS = [
  '#B9DEC8',
  '#BEE9DE',
  '#B8DAF0',
  '#F6D2B8',
  '#EFB9A6',
  '#E9DABF',
  '#F4E8B2',
] as const

export interface SynthesisFlowStep {
  step: number
  title: string
  node_ids: string[]
  type: 'core' | 'detail' | 'question' | 'action'
  description: string
  parent_step: number | null
}

export interface SynthesisGroup {
  id: string
  name: string
  color: string
  node_ids: string[]
  summary: string
  flow: SynthesisFlowStep[]
}

export interface SynthesisConnection {
  from_group: string
  to_group: string
  label: string
  type: 'supports' | 'extends' | 'contradicts' | 'inspires' | 'depends_on'
}

export interface SynthesisResult {
  summary: string
  groups: SynthesisGroup[]
  connections: SynthesisConnection[]
  open_questions: string[]
  next_steps: string[]
}

export const NODE_DEFAULTS: Record<NodeType, Partial<BoardNode>> = {
  text: { width: 260, height: 180 },
  image: { width: 280, height: 280 },
  audio: { width: 280, height: 160 },
  list: { width: 260, height: 220 },
  code: { width: 320, height: 240 },
  link: { width: 320, height: 140 },
}
