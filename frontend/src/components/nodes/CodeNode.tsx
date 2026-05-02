import { useCallback, useState } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'

interface Props {
  node: BoardNode
}

export default function CodeNode({ node }: Props) {
  const { selectNode, updateNode } = useBoardStore()
  const [isEditing, setIsEditing] = useState(false)
  const isSelected = useBoardStore((s) => s.selectedId === node.id)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return
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
    [node.id, node.x, node.y, selectNode, isEditing]
  )

  return (
    <div
      className={`board-node code-node ${isSelected ? 'selected' : ''}`}
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
        <span className="node-type-icon">&lt;&gt;</span>
        <span className="node-meta">{node.language || 'code'}</span>
      </div>
      {isEditing ? (
        <textarea
          className="code-edit"
          value={node.code || ''}
          onChange={(e) => updateNode(node.id, { code: e.target.value })}
          onBlur={() => setIsEditing(false)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          autoFocus
          placeholder="Paste or write code..."
        />
      ) : (
        <pre className="code-preview">
          <code>{node.code || <span className="node-placeholder">Double-click to edit...</span>}</code>
        </pre>
      )}
    </div>
  )
}
