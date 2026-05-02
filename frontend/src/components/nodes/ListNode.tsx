import { useCallback, useRef, useEffect, useState } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'
import { useRefine } from '../../useRefine'
import { Sparkles, Loader2 } from 'lucide-react'

interface Props {
  node: BoardNode
}

export default function ListNode({ node }: Props) {
  const { selectNode, updateNode } = useBoardStore()
  const refine = useRefine()
  const isSelected = useBoardStore((s) => s.selectedId === node.id)
  const items = node.items || ['']
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [isEditing, setIsEditing] = useState(() => !!node._autoEdit)

  useEffect(() => {
    if (node._autoEdit) {
      updateNode(node.id, { _autoEdit: false })
    }
  }, [node.id, node._autoEdit, updateNode])

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => inputRefs.current[0]?.focus())
    }
  }, [isEditing])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('list-input')) return
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
    const focusIdx = Math.min(index, newItems.length - 1)
    requestAnimationFrame(() => inputRefs.current[focusIdx]?.focus())
  }

  const insertItemAfter = (index: number) => {
    const newItems = [...items]
    newItems.splice(index + 1, 0, '')
    updateNode(node.id, { items: newItems })
    requestAnimationFrame(() => inputRefs.current[index + 1]?.focus())
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    e.stopPropagation()

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      ;(e.target as HTMLInputElement).blur()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      insertItemAfter(index)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (index < items.length - 1) {
        inputRefs.current[index + 1]?.focus()
      } else if (items[index].trim()) {
        insertItemAfter(index)
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
      return
    }

    if (e.key === 'Backspace' && items[index] === '' && items.length > 1) {
      e.preventDefault()
      removeItem(index)
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else if (!e.shiftKey && index < items.length - 1) {
        inputRefs.current[index + 1]?.focus()
      }
      return
    }
  }

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, items.length)
  }, [items.length])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    requestAnimationFrame(() => inputRefs.current[0]?.focus())
  }

  const handleBlur = (e: React.FocusEvent) => {
    // If focus moves outside the node
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsEditing(false)
      const text = items.filter(Boolean).join('\n')
      if (text.trim()) refine(node.id, text)
    }
  }

  return (
    <div
      className={`board-node list-node ${isSelected ? 'selected' : ''}`}
      style={{
        width: node.width,
        minHeight: node.height,
        backgroundColor: node.color,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
    >
      <div className="node-header">
        <span className="node-type-icon">☰</span>
        <span className="node-meta flex items-center gap-1">
          {node.author}
          {node._isRefining && <Loader2 className="w-3 h-3 animate-spin ml-1 text-gray-500" />}
        </span>
      </div>
      {isEditing ? (
        <ul className="list-items">
          {items.map((item: string, i: number) => (
            <li key={i} className="list-item">
              <span className="list-bullet">•</span>
              <input
                ref={(el) => { inputRefs.current[i] = el }}
                className="list-input"
                value={item}
                onChange={(e) => {
                  updateItem(i, e.target.value)
                  updateNode(node.id, { refined: null })
                }}
                onKeyDown={(e) => handleKeyDown(e, i)}
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
      ) : (
        <div className="node-content relative">
          {node.refined ? (
            <div className="whitespace-pre-wrap pl-4">
              <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
              {node.refined.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className="list-item-display">
                  <span className="list-bullet">•</span> {line.replace(/^[-*•]\s*/, '')}
                </div>
              ))}
            </div>
          ) : (
            <ul className="list-items-display pl-4">
              {items.filter(Boolean).map((item, i) => (
                <li key={i} className="list-item-display">
                  <span className="list-bullet">•</span> {item}
                </li>
              ))}
              {!items.some(Boolean) && <span className="node-placeholder">Double-click to edit...</span>}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
