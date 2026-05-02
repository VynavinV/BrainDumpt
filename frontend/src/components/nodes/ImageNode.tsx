import { useCallback, useState } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'

interface Props {
  node: BoardNode
}

export default function ImageNode({ node }: Props) {
  const { selectNode, updateNode } = useBoardStore()
  const [isDragging, setIsDragging] = useState(false)

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        updateNode(node.id, { imageUrl: ev.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (ev) => {
              updateNode(node.id, { imageUrl: ev.target?.result as string })
            }
            reader.readAsDataURL(file)
          }
          break
        }
      }
    },
    [node.id, updateNode]
  )

  const isSelected = useBoardStore((s) => s.selectedId === node.id)

  return (
    <div
      className={`board-node image-node ${isSelected ? 'selected' : ''} ${isDragging ? 'drag-over' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        minHeight: node.height,
        backgroundColor: node.color,
      }}
      onMouseDown={handleMouseDown}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onPaste={handlePaste}
    >
      <div className="node-header">
        <span className="node-type-icon">🖼</span>
        <span className="node-meta">{node.author}</span>
      </div>
      {node.imageUrl ? (
        <img src={node.imageUrl} alt="" className="node-image" draggable={false} />
      ) : (
        <div className="image-drop-zone">
          <div className="drop-icon">📷</div>
          <span>Drop image or paste</span>
        </div>
      )}
    </div>
  )
}
