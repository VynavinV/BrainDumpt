import { useState, useCallback, useRef } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'

interface Props {
  node: BoardNode
}

export default function TextNode({ node }: Props) {
  const { selectNode, selectedId, updateNode } = useBoardStore()
  const isSelected = selectedId === node.id
  const dragRef = useRef<{ startX: number; startY: number; nodeX: number; nodeY: number } | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return
      e.stopPropagation()
      selectNode(node.id)
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        nodeX: node.x,
        nodeY: node.y,
      }

      const handleMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const dx = ev.clientX - dragRef.current.startX
        const dy = ev.clientY - dragRef.current.startY
        useBoardStore.getState().updateNode(node.id, {
          x: dragRef.current.nodeX + dx,
          y: dragRef.current.nodeY + dy,
        })
      }

      const handleUp = () => {
        dragRef.current = null
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [node.id, node.x, node.y, selectNode, isEditing]
  )

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
  }

  return (
    <div
      className={`board-node text-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        minHeight: node.height,
        backgroundColor: node.color,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="node-header">
        <span className="node-type-icon">T</span>
        <span className="node-meta">{node.author} · {new Date(node.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      {isEditing ? (
        <textarea
          className="node-edit-area"
          value={node.content}
          onChange={(e) => updateNode(node.id, { content: e.target.value })}
          onBlur={handleBlur}
          autoFocus
          placeholder="Start typing your thought..."
        />
      ) : (
        <div className="node-content">
          {node.content || <span className="node-placeholder">Double-click to edit...</span>}
        </div>
      )}
    </div>
  )
}
