import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useBoardStore } from '../store'

export default function Canvas({ children }: { children: ReactNode }) {
  const { viewport, setViewport, isPanning, setPanning, selectNode, selectedId } = useBoardStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 })
  const spaceHeld = useRef(false)

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
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        spaceHeld.current = true
      }
      if (e.key === 'Backspace' && selectedId && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        useBoardStore.getState().deleteNode(selectedId)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selectedId])

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

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : spaceHeld.current ? 'grab' : 'default' }}
    >
      <div
        className="canvas-world"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
      <div className="canvas-grid" />
    </div>
  )
}
