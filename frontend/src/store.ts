import { create } from 'zustand'
import type { BoardNode, NodeType, Viewport } from './types'
import { NODE_COLORS, NODE_DEFAULTS } from './types'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

interface BoardState {
  nodes: BoardNode[]
  selectedId: string | null
  viewport: Viewport
  isPanning: boolean
  mode: 'visionary' | 'builder'
  rightPanelOpen: boolean
  addNode: (type: NodeType, x?: number, y?: number) => void
  updateNode: (id: string, patch: Partial<BoardNode>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string | null) => void
  setViewport: (v: Partial<Viewport>) => void
  setPanning: (p: boolean) => void
  setMode: (m: 'visionary' | 'builder') => void
  setRightPanelOpen: (open: boolean) => void
  moveNode: (id: string, dx: number, dy: number) => void
}

export const useBoardStore = create<BoardState>((set, get) => ({
  nodes: [],
  selectedId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  isPanning: false,
  mode: 'visionary',
  rightPanelOpen: false,

  addNode: (type, x, y) => {
    const { viewport, nodes } = get()
    const defaults = NODE_DEFAULTS[type]
    const color = NODE_COLORS[nodes.length % NODE_COLORS.length]
    const cx = x ?? (window.innerWidth / 2 - viewport.x) / viewport.zoom - (defaults.width || 260) / 2
    const cy = y ?? (window.innerHeight / 2 - viewport.y) / viewport.zoom - (defaults.height || 180) / 2
    const node: BoardNode = {
      id: uid(),
      type,
      x: cx + (Math.random() * 40 - 20),
      y: cy + (Math.random() * 40 - 20),
      width: defaults.width || 260,
      height: defaults.height || 180,
      color,
      content: '',
      items: type === 'list' ? [''] : undefined,
      code: type === 'code' ? '' : undefined,
      language: type === 'code' ? 'javascript' : undefined,
      linkUrl: type === 'link' ? '' : undefined,
      author: 'You',
      createdAt: Date.now(),
    }
    set({ nodes: [...nodes, node], selectedId: node.id, rightPanelOpen: true })
  },

  updateNode: (id, patch) => {
    set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
      rightPanelOpen: get().selectedId === id ? false : get().rightPanelOpen,
    })
  },

  selectNode: (id) => {
    set({ selectedId: id, rightPanelOpen: id !== null })
  },

  setViewport: (v) => {
    set({ viewport: { ...get().viewport, ...v } })
  },

  setPanning: (p) => set({ isPanning: p }),
  setMode: (m) => set({ mode: m }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),

  moveNode: (id, dx, dy) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n
      ),
    })
  },
}))
