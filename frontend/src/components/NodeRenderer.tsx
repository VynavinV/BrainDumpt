import { useState, useRef, useCallback } from 'react'
import type { BoardNode } from '../types'
import { useBoardStore } from '../store'
import TextNode from './nodes/TextNode'
import ImageNode from './nodes/ImageNode'
import AudioNode from './nodes/AudioNode'
import ListNode from './nodes/ListNode'
import CodeNode from './nodes/CodeNode'
import LinkNode from './nodes/LinkNode'

const renderers: Record<BoardNode['type'], React.FC<{ node: BoardNode }>> = {
  text: TextNode,
  image: ImageNode,
  audio: AudioNode,
  list: ListNode,
  code: CodeNode,
  link: LinkNode,
}

interface Props {
  node: BoardNode
}

export default function NodeRenderer({ node }: Props) {
  const selectedId = useBoardStore((s) => s.selectedId)
  const isSelected = selectedId === node.id
  const addChildNode = useBoardStore((s) => s.addChildNode)
  const [hovered, setHovered] = useState(false)
  const dragRef = useRef<{ started: boolean; startX: number; startY: number } | null>(null)

  const Component = renderers[node.type]

  const showHandles = hovered || isSelected

  const handleRightHandleDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { started: false, startX: e.clientX, startY: e.clientY }

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      if (!dragRef.current.started && (Math.abs(ev.clientX - dragRef.current.startX) > 5 || Math.abs(ev.clientY - dragRef.current.startY) > 5)) {
        dragRef.current.started = true
      }
    }

    const handleUp = (ev: MouseEvent) => {
      if (dragRef.current?.started) {
        const target = document.elementFromPoint(ev.clientX, ev.clientY)
        const nodeEl = target?.closest('[data-node-id]')
        if (nodeEl) {
          const targetId = nodeEl.getAttribute('data-node-id')
          if (targetId && targetId !== node.id) {
            useBoardStore.getState().connectNodes(node.id, targetId)
          }
        }
      } else {
        addChildNode(node.id)
      }
      dragRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [node.id, addChildNode])

  const handleDisconnect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    useBoardStore.getState().disconnectNode(node.id)
  }, [node.id])

  return (
    <div
      className="node-wrapper"
      style={{
        zIndex: (node._z ?? 1),
        left: node.x,
        top: node.y,
      }}
      data-node-id={node.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {Component && <Component node={node} />}
      {showHandles && (
        <>
          <div
            className="node-handle node-handle-right"
            onMouseDown={handleRightHandleDown}
            title="Click to add child · Drag to connect"
          />
          {node.parentId && (
            <div
              className="node-handle node-handle-left"
              onMouseDown={handleDisconnect}
              title="Disconnect from parent"
            />
          )}
        </>
      )}
    </div>
  )
}
