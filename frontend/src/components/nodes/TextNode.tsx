import { useState, useEffect, useCallback, useRef } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'
import { useRefine } from '../../useRefine'
import { Sparkles, Loader2 } from 'lucide-react'

interface Props {
  node: BoardNode
}

export default function TextNode({ node }: Props) {
  const { selectNode, selectedId, updateNode } = useBoardStore()
  const refine = useRefine()
  const isSelected = selectedId === node.id
  const dragRef = useRef<{ startX: number; startY: number; nodeX: number; nodeY: number } | null>(null)
  const [isEditing, setIsEditing] = useState(() => !!node._autoEdit)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (node._autoEdit) {
      updateNode(node.id, { _autoEdit: false })
    }
  }, [node.id, node._autoEdit, updateNode])

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [isEditing])

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
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const finishEditing = () => {
    setIsEditing(false)
    textareaRef.current?.blur()
    if (node.content) {
      refine(node.id, node.content)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      finishEditing()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      finishEditing()
    }
  }

  return (
    <div
      className={`board-node text-node ${isSelected ? 'selected' : ''}`}
      style={{
        width: node.width,
        minHeight: node.height,
        backgroundColor: node.color,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="node-header">
        <span className="node-type-icon">T</span>
        <span className="node-meta flex items-center gap-1">
          {node.author} · {new Date(node.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {node._isRefining && <Loader2 className="w-3 h-3 animate-spin ml-1 text-gray-500" />}
        </span>
      </div>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="node-edit-area"
          value={node.content}
          onChange={(e) => updateNode(node.id, { content: e.target.value, refined: null })}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
          placeholder="Start typing your thought..."
        />
      ) : (
        <div className="node-content relative">
          {node.refined ? (
            <div className="whitespace-pre-wrap">
              <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
              {node.refined}
            </div>
          ) : (
            node.content || <span className="node-placeholder">Double-click to edit...</span>
          )}
        </div>
      )}
    </div>
  )
}
