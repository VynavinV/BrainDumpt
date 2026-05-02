import { useEffect, useRef, useCallback, useState, type ReactNode } from 'react'
import { useBoardStore } from '../store'
import { boardSync } from '../sync'
import type { NodeType } from '../types'

const SHORTCUT_MAP: Record<string, NodeType> = {
  t: 'text',
  i: 'image',
  a: 'audio',
  l: 'list',
  c: 'code',
  k: 'link',
}

function ConnectionLines() {
  const nodes = useBoardStore((s) => s.nodes)
  const edges: { id: string; x1: number; y1: number; x2: number; y2: number }[] = []

  for (const child of nodes) {
    if (!child.parentId) continue
    const parent = nodes.find((n) => n.id === child.parentId)
    if (!parent) continue

    edges.push({
      id: `${parent.id}-${child.id}`,
      x1: parent.x + parent.width,
      y1: parent.y + parent.height / 2,
      x2: child.x,
      y2: child.y + child.height / 2,
    })
  }

  if (edges.length === 0) return null

  return (
    <svg
      className="connection-svg"
      style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' }}
    >
      <defs>
        <filter id="synapseGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {edges.map((e) => {
        const dx = Math.abs(e.x2 - e.x1) * 0.4
        const d = `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`
        const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1)
        const dur = Math.max(1.4, Math.min(3.5, len / 280))
        return (
          <g key={e.id} className="synapse-group">
            <path d={d} fill="none" stroke="rgba(129,140,248,0.18)" strokeWidth={6} filter="url(#synapseGlow)" />
            <path d={d} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.4} />
            {[0, 0.33, 0.66].map((delay, i) => (
              <circle key={i} r={2.6} fill="#c7d2fe" opacity={0.95} filter="url(#synapseGlow)">
                <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={d} begin={`-${delay * dur}s`} />
              </circle>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

export default function Canvas({ children }: { children: ReactNode }) {
  const { viewport, setViewport, isPanning, setPanning, selectNode, nodes, addNode, mode, showShortcuts } = useBoardStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 })
  const spaceHeld = useRef(false)
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  const lastKeyTime = useRef(0)

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.003
        const newZoom = Math.min(Math.max(viewport.zoom * (1 + delta), 0.15), 4)
        const rect = (e.target as HTMLElement).closest('.canvas-container')?.getBoundingClientRect()
        if (!rect) return
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const scale = newZoom / viewport.zoom
        setViewport({
          zoom: newZoom,
          x: mouseX - (mouseX - viewport.x) * scale,
          y: mouseY - (mouseY - viewport.y) * scale,
        })
      } else {
        setViewport({
          x: viewport.x - e.deltaX,
          y: viewport.y - e.deltaY,
        })
      }
    },
    [viewport, setViewport]
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

      if (isInput) {
        if (e.key === 'Escape') {
          ;(target as HTMLElement).blur()
          useBoardStore.getState().selectNode(null)
        }
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        spaceHeld.current = true
        setIsSpaceHeld(true)
        return
      }

      if (e.key === 'Escape') {
        useBoardStore.getState().selectNode(null)
        return
      }

      if (e.key === 'Enter' && e.shiftKey) {
        const { selectedId } = useBoardStore.getState()
        if (selectedId) {
          e.preventDefault()
          useBoardStore.getState().addChildNode(selectedId)
          return
        }
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const { selectedId } = useBoardStore.getState()
        if (selectedId) {
          e.preventDefault()
          useBoardStore.getState().deleteNode(selectedId)
        }
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        useBoardStore.getState().setShowShortcuts(!useBoardStore.getState().showShortcuts)
        return
      }

      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        useBoardStore.getState().setUserHasZoomed(true)
        useBoardStore.getState().zoomToFit()
        return
      }

      if (e.key === '=' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        useBoardStore.getState().setViewport({ zoom: Math.min(viewport.zoom * 1.2, 4) })
        return
      }

      if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        useBoardStore.getState().setViewport({ zoom: Math.max(viewport.zoom * 0.8, 0.15) })
        return
      }

      const key = e.key.toLowerCase()
      if (SHORTCUT_MAP[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const now = Date.now()
        if (now - lastKeyTime.current < 300) return
        lastKeyTime.current = now
        useBoardStore.getState().addNode(SHORTCUT_MAP[key])
        return
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld.current = false
        setIsSpaceHeld(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [viewport.zoom])

  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom,
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && spaceHeld.current)) {
      e.preventDefault()
      setPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y }
    } else if (e.button === 0 && (e.target as HTMLElement) === containerRef.current) {
      selectNode(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e.clientX, e.clientY)
    boardSync.sendCursor(pos.x, pos.y)
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setViewport({
      x: panStart.current.vx + dx,
      y: panStart.current.vy + dy,
    })
  }

  const handleMouseUp = () => {
    if (isPanning) setPanning(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.type.startsWith('image/')) {
      const pos = getCanvasPos(e.clientX, e.clientY)
      addNode('image', pos.x, pos.y)
      const ns = useBoardStore.getState().nodes
      const lastNode = ns[ns.length - 1]
      if (lastNode) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          useBoardStore.getState().updateNode(lastNode.id, { imageUrl: ev.target?.result as string })
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const rect = containerRef.current?.getBoundingClientRect()
          if (!rect) return
          const cx = (rect.width / 2 - viewport.x) / viewport.zoom
          const cy = (rect.height / 2 - viewport.y) / viewport.zoom
          addNode('image', cx, cy)
          const ns = useBoardStore.getState().nodes
          const lastNode = ns[ns.length - 1]
          if (lastNode) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              useBoardStore.getState().updateNode(lastNode.id, { imageUrl: ev.target?.result as string })
            }
            reader.readAsDataURL(file)
          }
        }
        break
      }
    }
  }, [addNode, viewport])

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPaste={handlePaste}
      tabIndex={-1}
      style={{ cursor: isPanning ? 'grabbing' : isSpaceHeld ? 'grab' : 'default' }}
    >
      <div
        className="canvas-world"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
        <ConnectionLines />
        <div className="canvas-grid" />
      </div>
      {nodes.length === 0 && !isPanning && (
        <div className="canvas-empty">
          <div className="empty-icon">🧠</div>
          <div className="empty-title">Drop your thoughts here</div>
          <div className="empty-hint">
            {mode === 'builder'
              ? 'Type T L C I A K to create notes · ? for shortcuts'
              : 'Use the tools on the left to add notes, or drag an image onto the canvas'}
          </div>
          <div className="empty-hint">Scroll to pan · Ctrl+Scroll to zoom · Space+Drag to pan</div>
        </div>
      )}
      {showShortcuts && <ShortcutsOverlay />}
    </div>
  )
}

function ShortcutsOverlay() {
  const close = () => useBoardStore.getState().setShowShortcuts(false)
  return (
    <div className="shortcuts-overlay" onMouseDown={close}>
      <div className="shortcuts-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="shortcuts-title">Keyboard Shortcuts</div>
        <div className="shortcuts-grid">
          {[
            ['T', 'New text note'],
            ['L', 'New list'],
            ['C', 'New code snippet'],
            ['I', 'New image'],
            ['A', 'New audio memo'],
            ['K', 'New link'],
            ['Shift+Enter', 'Add child node'],
            ['Del', 'Delete selected'],
            ['Esc', 'Deselect'],
            ['Space+Drag', 'Pan canvas'],
            ['Ctrl+Scroll', 'Zoom'],
            ['Ctrl+0', 'Zoom to fit'],
            ['Ctrl+/-', 'Zoom in/out'],
            ['?', 'Toggle this guide'],
            ['Enter', 'Add list item'],
            ['↑↓', 'Navigate list'],
          ].map(([key, desc]) => (
            <div key={key} className="shortcut-row">
              <kbd className="shortcut-key">{key}</kbd>
              <span className="shortcut-desc">{desc}</span>
            </div>
          ))}
        </div>
        <button className="shortcuts-close" onClick={close}>Press ? or Esc to close</button>
      </div>
    </div>
  )
}
