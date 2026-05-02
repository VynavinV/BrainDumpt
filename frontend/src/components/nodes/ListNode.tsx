import { useCallback } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'

interface Props {
  node: BoardNode
}

export default function ListNode({ node }: Props) {
  const { selectNode, updateNode } = useBoardStore()
  const isSelected = useBoardStore((s) => s.selectedId === node.id)
  const items = node.items || ['']

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

  const updateItem = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    if (index === items.length - 1 && value.trim()) {
      newItems.push('')
    }
    updateNode(node.id, { items: newItems })
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    const newItems = items.filter((_item: string, idx: number) => idx !== index)
    updateNode(node.id, { items: newItems })
  }

  return (
    <div
      className={`board-node list-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        minHeight: node.height,
        backgroundColor: node.color,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="node-header">
        <span className="node-type-icon">☰</span>
        <span className="node-meta">{node.author}</span>
      </div>
      <ul className="list-items">
        {items.map((item: string, i: number) => (
          <li key={i} className="list-item">
            <span className="list-bullet">•</span>
            <input
              className="list-input"
              value={item}
              onChange={(e) => { e.stopPropagation(); updateItem(i, e.target.value) }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder={i === items.length - 1 ? 'Add item...' : ''}
            />
            {items.length > 1 && (
              <button
                className="list-remove"
                onClick={(e) => { e.stopPropagation(); removeItem(i) }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
