import { useCallback } from 'react'
import { useBoardStore } from './store'

const API_URL = import.meta.env.VITE_API_URL || 'https://braindumpt-backend-production.up.railway.app'

interface ContextItem {
  role: string
  content: string
}

function gatherContext(nodeId: string): ContextItem[] {
  const nodes = useBoardStore.getState().nodes
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return []

  const ctx: ContextItem[] = []
  const connected = new Set<string>([nodeId])

  if (node.parentId) {
    connected.add(node.parentId)
    const parent = nodes.find((n) => n.id === node.parentId)
    if (parent) {
      const text = parent.content || parent.transcript || (parent.items?.filter(Boolean).join('\n') ?? '')
      if (text.trim()) ctx.push({ role: 'parent', content: text.slice(0, 300) })
    }
  }

  const siblings = nodes.filter((n) => n.parentId === node.parentId && n.id !== nodeId)
  for (const sib of siblings) {
    connected.add(sib.id)
    const text = sib.content || sib.transcript || (sib.items?.filter(Boolean).join('\n') ?? '')
    if (text.trim()) ctx.push({ role: 'sibling', content: text.slice(0, 200) })
  }

  const children = nodes.filter((n) => n.parentId === nodeId)
  for (const child of children) {
    connected.add(child.id)
    const text = child.content || child.transcript || (child.items?.filter(Boolean).join('\n') ?? '')
    if (text.trim()) ctx.push({ role: 'child', content: text.slice(0, 200) })
  }

  const nearby = nodes
    .filter((n) => !connected.has(n.id))
    .map((n) => ({ text: n.content || n.transcript || (n.items?.filter(Boolean).join('\n') ?? ''), id: n.id }))
    .filter((n) => n.text.trim())
    .slice(0, 4)

  for (const nb of nearby) {
    ctx.push({ role: 'context', content: nb.text.slice(0, 150) })
  }

  return ctx
}

export function useRefine() {
  const updateNode = useBoardStore((s) => s.updateNode)

  const refine = useCallback(async (nodeId: string, rawContent: string): Promise<string | null> => {
    const trimmed = rawContent.trim()
    if (!trimmed) return null

    const node = useBoardStore.getState().nodes.find((n) => n.id === nodeId)
    if (node?.refined === trimmed) return null

    const context = gatherContext(nodeId)
    
    updateNode(nodeId, { _isRefining: true })

    try {
      const res = await fetch(`${API_URL}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, context, node_type: node?.type }),
      })
      if (!res.ok) {
        updateNode(nodeId, { _isRefining: false })
        return null
      }
      const data = await res.json()
      if (data.refined && data.refined !== trimmed) {
        updateNode(nodeId, { refined: data.refined, _isRefining: false })
        return data.refined
      }
    } catch (err) {
      console.error('Refine failed:', err)
    }
    
    updateNode(nodeId, { _isRefining: false })
    return null
  }, [updateNode])

  return refine
}
