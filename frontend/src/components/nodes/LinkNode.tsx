import { useCallback, useState } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'

interface Props {
  node: BoardNode
}

export default function LinkNode({ node }: Props) {
  const { selectNode, updateNode } = useBoardStore()
  const [isEditing, setIsEditing] = useState(false)
  const isSelected = useBoardStore((s) => s.selectedId === node.id)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      selectNode(node.id)
      const startX = e.clientX
      const startY = e.clientY
      const nodeX = node.x
      const nodeY = node.y

      const handleMove = (ev: MouseEvent) => {
        useBoardStore.getState().updateNode(node.id, {
          x: nodeX + ev.clientX - startX,
          y: nodeY + ev.clientY - startY,
        })
      }

      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [node.id, node.x, node.y, selectNode]
  )

  return (
    <div
      className={`board-node link-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        minHeight: node.height,
        backgroundColor: node.color,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
    >
      <div className="node-header">
        <span className="node-type-icon">🔗</span>
        <span className="node-meta">{node.author}</span>
      </div>
      {isEditing ? (
        <input
          className="link-edit"
          value={node.linkUrl || ''}
          onChange={(e) => updateNode(node.id, { linkUrl: e.target.value })}
          onBlur={() => setIsEditing(false)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          autoFocus
          placeholder="Paste a URL..."
        />
      ) : (
        <div className="link-content">
          {node.linkUrl ? (
            <a
              href={node.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-url"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {node.linkUrl}
            </a>
          ) : (
            <span className="node-placeholder">Double-click to add a link...</span>
          )}
          {node.content && <div className="link-description">{node.content}</div>}
        </div>
      )}
    </div>
  )
}
