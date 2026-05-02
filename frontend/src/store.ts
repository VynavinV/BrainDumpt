import { create } from 'zustand'
import type { BoardNode, NodeType, Viewport, SynthesisResult } from './types'
import { NODE_COLORS, NODE_DEFAULTS } from './types'
import { boardSync, type RemoteUser, type RemoteCursor } from './sync'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export type FilterType = 'all' | NodeType

interface BoardState {
  nodes: BoardNode[]
  selectedId: string | null
  viewport: Viewport
  isPanning: boolean
  mode: 'visionary' | 'builder'
  rightPanelOpen: boolean
  filter: FilterType
  userHasZoomed: boolean
  showShortcuts: boolean
  synthesisResult: SynthesisResult | null
  isSynthesizing: boolean
  showSynthesis: boolean
  preLayoutPositions: Map<string, { x: number; y: number }> | null
  boardTitle: string
  users: RemoteUser[]
  remoteCursors: Record<string, RemoteCursor>
  username: string
  setUsername: (u: string) => void
  setBoardTitle: (t: string) => void
  addNode: (type: NodeType, x?: number, y?: number, parentId?: string) => void
  updateNode: (id: string, patch: Partial<BoardNode>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string | null) => void
  setViewport: (v: Partial<Viewport>) => void
  setPanning: (p: boolean) => void
  setMode: (m: 'visionary' | 'builder') => void
  setRightPanelOpen: (open: boolean) => void
  moveNode: (id: string, dx: number, dy: number) => void
  setFilter: (f: FilterType) => void
  setUserHasZoomed: (v: boolean) => void
  setShowShortcuts: (v: boolean) => void
  zoomToFit: () => void
  addChildNode: (parentId: string) => void
  connectNodes: (parentId: string, childId: string) => void
  disconnectNode: (childId: string) => void
  setSynthesisResult: (result: SynthesisResult | null) => void
  setIsSynthesizing: (v: boolean) => void
  toggleSynthesis: () => void
  clearSynthesis: () => void
  applySynthesisLayout: () => void
  revertLayout: () => void
  _setRemoteNodes: (nodes: BoardNode[]) => void
  _applyRemoteUpsert: (node: BoardNode) => void
  _applyRemotePatch: (id: string, patch: Partial<BoardNode>) => void
  _applyRemoteDelete: (id: string, children: string[]) => void
  _setBoardTitle: (t: string) => void
  _setUsers: (u: RemoteUser[]) => void
  _addUser: (u: RemoteUser) => void
  _removeUser: (id: string) => void
  _setRemoteCursor: (c: RemoteCursor) => void
}

let maxZ = 1

function findFreeSpot(
  nodes: BoardNode[],
  canvasCenterX: number,
  canvasCenterY: number,
  width: number,
  height: number,
  gap: number
): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: canvasCenterX - width / 2, y: canvasCenterY - height / 2 }
  }

  const occupied = nodes.map((n) => ({
    x: n.x - gap,
    y: n.y - gap,
    w: n.width + gap * 2,
    h: n.height + gap * 2,
    r: n.x + n.width + gap,
    b: n.y + n.height + gap,
  }))

  const checkOverlap = (x: number, y: number) => {
    const cr = x + width
    const cb = y + height
    for (const o of occupied) {
      if (x < o.r && cr > o.x && y < o.b && cb > o.y) return true
    }
    return false
  }

  const maxSteps = 500
  for (let step = 1; step < maxSteps; step++) {
    const angle = step * 2.4
    const radius = 10 + step * 5
    const cx = canvasCenterX + Math.cos(angle) * radius - width / 2
    const cy = canvasCenterY + Math.sin(angle) * radius - height / 2
    if (!checkOverlap(cx, cy)) {
      return { x: Math.round(cx / 10) * 10, y: Math.round(cy / 10) * 10 }
    }
  }

  return {
    x: canvasCenterX - width / 2 + (Math.random() * 400 - 200),
    y: canvasCenterY - height / 2 + (Math.random() * 400 - 200),
  }
}

export const useBoardStore = create<BoardState>((set, get) => ({
  nodes: [],
  selectedId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  isPanning: false,
  mode: 'visionary',
  rightPanelOpen: false,
  filter: 'all',
  userHasZoomed: false,
  showShortcuts: false,
  synthesisResult: null,
  isSynthesizing: false,
  showSynthesis: false,
  preLayoutPositions: null as Map<string, { x: number; y: number }> | null,
  boardTitle: 'Untitled Board',
  users: [],
  remoteCursors: {},
  username: typeof window !== 'undefined' ? (localStorage.getItem('bd_username') || '') : '',
  setUsername: (u) => {
    if (typeof window !== 'undefined') localStorage.setItem('bd_username', u)
    set({ username: u })
  },
  setBoardTitle: (t) => {
    set({ boardTitle: t })
    boardSync.sendTitle(t)
  },

  addNode: (type, x, y, parentId) => {
    const { viewport, nodes, userHasZoomed, username } = get()
    const defaults = NODE_DEFAULTS[type]
    const color = NODE_COLORS[nodes.length % NODE_COLORS.length]
    const w = defaults.width || 260
    const h = defaults.height || 180
    const author = username || 'You'

    if (parentId) {
      const parent = nodes.find((n) => n.id === parentId)
      if (parent) {
        const siblings = nodes.filter((n) => n.parentId === parentId)
        const childX = parent.x + parent.width + 40
        const childY = parent.y + siblings.length * (h + 20)
        maxZ += 1
        const node: BoardNode = {
          id: uid(),
          type,
          x: Math.round(childX / 10) * 10,
          y: Math.round(childY / 10) * 10,
          width: w,
          height: h,
          color,
          content: '',
          items: type === 'list' ? [''] : undefined,
          code: type === 'code' ? '' : undefined,
          language: type === 'code' ? 'javascript' : undefined,
          linkUrl: type === 'link' ? '' : undefined,
          author,
          createdAt: Date.now(),
          parentId,
          refined: null,
          _z: maxZ,
          _autoEdit: true,
        }
        set({ nodes: [...nodes, node], selectedId: node.id, rightPanelOpen: true })
        boardSync.sendUpsert(node)
        requestAnimationFrame(() => get().zoomToFit())
        return
      }
    }

    const canvasEl = document.querySelector('.canvas-container')
    const rect = canvasEl?.getBoundingClientRect()
    const canvasW = rect?.width ?? window.innerWidth
    const canvasH = rect?.height ?? window.innerHeight
    const canvasCX = (canvasW / 2 - viewport.x) / viewport.zoom
    const canvasCY = (canvasH / 2 - viewport.y) / viewport.zoom

    const pos = x !== undefined && y !== undefined
      ? { x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10 }
      : findFreeSpot(nodes, canvasCX, canvasCY, w, h, 16)

    maxZ += 1
    const node: BoardNode = {
      id: uid(),
      type,
      x: pos.x,
      y: pos.y,
      width: w,
      height: h,
      color,
      content: '',
      items: type === 'list' ? [''] : undefined,
      code: type === 'code' ? '' : undefined,
      language: type === 'code' ? 'javascript' : undefined,
      linkUrl: type === 'link' ? '' : undefined,
      author,
      createdAt: Date.now(),
      parentId: null,
      refined: null,
      _z: maxZ,
      _autoEdit: true,
    }
    set({ nodes: [...nodes, node], selectedId: node.id, rightPanelOpen: true })
    boardSync.sendUpsert(node)

    if (!userHasZoomed && nodes.length > 0) {
      requestAnimationFrame(() => {
        get().zoomToFit()
      })
    }
  },

  updateNode: (id, patch) => {
    set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })
    boardSync.sendPatch(id, patch)
  },

  deleteNode: (id) => {
    const { nodes } = get()
    const toDelete = new Set<string>()
    const collect = (nid: string) => {
      toDelete.add(nid)
      nodes.filter((n) => n.parentId === nid).forEach((c) => collect(c.id))
    }
    collect(id)
    set({
      nodes: nodes.filter((n) => !toDelete.has(n.id)),
      selectedId: toDelete.has(get().selectedId || '') ? null : get().selectedId,
      rightPanelOpen: toDelete.has(get().selectedId || '') ? false : get().rightPanelOpen,
    })
    boardSync.sendDelete(id)
  },

  selectNode: (id) => {
    if (id !== null) {
      maxZ += 1
      set({
        selectedId: id,
        rightPanelOpen: true,
        nodes: get().nodes.map((n) => (n.id === id ? { ...n, _z: maxZ } : n)),
      })
    } else {
      set({ selectedId: null, rightPanelOpen: false })
    }
  },

  setViewport: (v) => {
    const patch = { ...get().viewport, ...v }
    if (v.zoom !== undefined && v.zoom !== get().viewport.zoom) {
      set({ viewport: patch, userHasZoomed: true })
    } else {
      set({ viewport: patch })
    }
  },

  setPanning: (p) => set({ isPanning: p }),
  setMode: (m) => set({ mode: m }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setFilter: (f) => set({ filter: f }),
  setUserHasZoomed: (v) => set({ userHasZoomed: v }),
  setShowShortcuts: (v) => set({ showShortcuts: v }),

  moveNode: (id, dx, dy) => {
    const target = get().nodes.find((n) => n.id === id)
    if (!target) return
    const nx = target.x + dx
    const ny = target.y + dy
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, x: nx, y: ny } : n
      ),
    })
    boardSync.sendPatch(id, { x: nx, y: ny })
  },

  addChildNode: (parentId) => {
    const { nodes, mode } = get()
    const parent = nodes.find((n) => n.id === parentId)
    if (!parent) return
    const type = mode === 'builder' ? 'text' : 'text'
    get().addNode(type, undefined, undefined, parentId)
  },

  connectNodes: (parentId, childId) => {
    const { nodes } = get()
    set({
      nodes: nodes.map((n) =>
        n.id === childId ? { ...n, parentId } : n
      ),
    })
    boardSync.sendPatch(childId, { parentId })
  },

  disconnectNode: (childId) => {
    const { nodes } = get()
    set({
      nodes: nodes.map((n) =>
        n.id === childId ? { ...n, parentId: null } : n
      ),
    })
    boardSync.sendPatch(childId, { parentId: null })
  },

  setSynthesisResult: (result) => {
    set({ synthesisResult: result, showSynthesis: result !== null })
    boardSync.sendSynthesis(result)
  },
  setIsSynthesizing: (v) => set({ isSynthesizing: v }),
  toggleSynthesis: () => set((s) => ({ showSynthesis: !s.showSynthesis })),
  clearSynthesis: () => {
    set({ synthesisResult: null, showSynthesis: false, preLayoutPositions: null })
    boardSync.sendSynthesisClear()
  },

  applySynthesisLayout: () => {
    const { nodes, synthesisResult } = get()
    if (!synthesisResult || synthesisResult.groups.length === 0) return

    const NODE_GAP = 24
    const GROUP_PAD_X = 50
    const GROUP_PAD_Y = 60
    const GROUP_GAP_X = 80
    const GROUP_GAP_Y = 100
    const MAX_PER_ROW = 3
    const START_X = 100
    const START_Y = 100

    const originalPos = new Map<string, { x: number; y: number }>()
    const updates: { id: string; x: number; y: number }[] = []

    let cursorX = START_X
    let cursorY = START_Y
    let pageMaxHeight = 0

    for (const group of synthesisResult.groups) {
      const gNodes = nodes.filter((n) => group.node_ids.includes(n.id))
      if (gNodes.length === 0) continue

      let localX = 0
      let localY = 0
      let rowMaxH = 0
      let groupW = 0
      let col = 0

      for (let i = 0; i < gNodes.length; i++) {
        const n = gNodes[i]
        const px = localX
        const py = localY
        rowMaxH = Math.max(rowMaxH, n.height)

        const targetX = cursorX + GROUP_PAD_X + px
        const targetY = cursorY + GROUP_PAD_Y + py

        originalPos.set(n.id, { x: n.x, y: n.y })
        updates.push({ id: n.id, x: Math.round(targetX / 10) * 10, y: Math.round(targetY / 10) * 10 })

        col++
        localX += n.width + NODE_GAP

        if (col >= MAX_PER_ROW || i === gNodes.length - 1) {
          groupW = Math.max(groupW, localX - NODE_GAP)
          localX = 0
          localY += rowMaxH + NODE_GAP
          rowMaxH = 0
          col = 0
        }
      }

      const groupH = localY - NODE_GAP

      if (cursorX + groupW + GROUP_PAD_X * 2 > 1600) {
        cursorX = START_X
        cursorY += pageMaxHeight + GROUP_GAP_Y
        pageMaxHeight = 0
      }

      cursorX += groupW + GROUP_PAD_X * 2 + GROUP_GAP_X
      pageMaxHeight = Math.max(pageMaxHeight, groupH + GROUP_PAD_Y * 2)
    }

    document.body.classList.add('synthesis-animating')

    set({
      preLayoutPositions: originalPos,
      nodes: get().nodes.map((n) => {
        const u = updates.find((u) => u.id === n.id)
        return u ? { ...n, x: u.x, y: u.y } : n
      }),
    })
    for (const u of updates) {
      boardSync.sendPatch(u.id, { x: u.x, y: u.y })
    }

    setTimeout(() => {
      get().zoomToFit()
    }, 50)

    setTimeout(() => {
      document.body.classList.remove('synthesis-animating')
    }, 800)
  },

  revertLayout: () => {
    const { nodes, preLayoutPositions } = get()
    if (!preLayoutPositions) return

    document.body.classList.add('synthesis-animating')

    set({
      preLayoutPositions: null,
      nodes: nodes.map((n) => {
        const orig = preLayoutPositions.get(n.id)
        return orig ? { ...n, x: orig.x, y: orig.y } : n
      }),
    })
    preLayoutPositions.forEach((pos, id) => {
      boardSync.sendPatch(id, { x: pos.x, y: pos.y })
    })

    setTimeout(() => {
      get().zoomToFit()
    }, 50)

    setTimeout(() => {
      document.body.classList.remove('synthesis-animating')
    }, 800)
  },

  zoomToFit: () => {
    const { nodes } = get()
    if (nodes.length === 0) {
      set({ viewport: { x: 0, y: 0, zoom: 1 } })
      return
    }
    const canvasEl = document.querySelector('.canvas-container')
    const rect = canvasEl?.getBoundingClientRect()
    const canvasW = rect?.width ?? window.innerWidth
    const canvasH = rect?.height ?? window.innerHeight
    const padding = 80

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.width)
      maxY = Math.max(maxY, n.y + n.height)
    }

    const boundsW = maxX - minX + padding * 2
    const boundsH = maxY - minY + padding * 2
    const scaleX = canvasW / boundsW
    const scaleY = canvasH / boundsH
    const zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.15), 1.5)

    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    set({
      viewport: {
        zoom,
        x: canvasW / 2 - cx * zoom,
        y: canvasH / 2 - cy * zoom,
      },
    })
  },

  _setRemoteNodes: (nodes) => {
    let m = 1
    for (const n of nodes) m = Math.max(m, n._z ?? 1)
    maxZ = Math.max(maxZ, m)
    set({ nodes })
  },

  _applyRemoteUpsert: (node) => {
    const existing = get().nodes
    const idx = existing.findIndex((n) => n.id === node.id)
    if (idx >= 0) {
      const merged = { ...existing[idx], ...node }
      set({ nodes: existing.map((n, i) => (i === idx ? merged : n)) })
    } else {
      maxZ = Math.max(maxZ, node._z ?? 1)
      set({ nodes: [...existing, { ...node, _autoEdit: false }] })
    }
  },

  _applyRemotePatch: (id, patch) => {
    set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })
  },

  _applyRemoteDelete: (id, children) => {
    const dead = new Set<string>([id, ...children])
    set({
      nodes: get().nodes.filter((n) => !dead.has(n.id)),
      selectedId: dead.has(get().selectedId || '') ? null : get().selectedId,
      rightPanelOpen: dead.has(get().selectedId || '') ? false : get().rightPanelOpen,
    })
  },

  _setBoardTitle: (t) => set({ boardTitle: t }),

  _setUsers: (u) => set({ users: u }),

  _addUser: (u) => set({ users: [...get().users.filter((x) => x.id !== u.id), u] }),

  _removeUser: (id) => {
    const cursors = { ...get().remoteCursors }
    delete cursors[id]
    set({ users: get().users.filter((u) => u.id !== id), remoteCursors: cursors })
  },

  _setRemoteCursor: (c) => {
    set({ remoteCursors: { ...get().remoteCursors, [c.user_id]: c } })
  },
}))
