import { useCallback } from 'react'
import { useBoardStore } from './store'
import type { SynthesisResult } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface SynthesizeNodePayload {
  id: string
  type: string
  content: string
  items: string[]
  code: string
  language: string
  link_url: string
  transcript: string
}

export function useSynthesis() {
  const synthesize = useCallback(async (boardTitle: string = ''): Promise<SynthesisResult | null> => {
    const nodes = useBoardStore.getState().nodes
    if (nodes.length === 0) return null

    const store = useBoardStore.getState()
    store.setIsSynthesizing(true)
    store.setSynthesisResult(null)
    store.setRightPanelOpen(false)

    const payload: SynthesizeNodePayload[] = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      content: n.refined || n.content || '',
      items: n.items || [],
      code: n.code || '',
      language: n.language || '',
      link_url: n.linkUrl || '',
      transcript: n.transcript || '',
    }))

    try {
      const res = await fetch(`${API_URL}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: payload, board_title: boardTitle }),
      })

      if (!res.ok) {
        useBoardStore.getState().setIsSynthesizing(false)
        return null
      }

      const data: SynthesisResult = await res.json()
      useBoardStore.getState().setSynthesisResult(data)

      setTimeout(() => {
        useBoardStore.getState().applySynthesisLayout()
      }, 300)

      return data
    } catch (err) {
      console.error('Synthesis failed:', err)
      useBoardStore.getState().setIsSynthesizing(false)
      return null
    } finally {
      useBoardStore.getState().setIsSynthesizing(false)
    }
  }, [])

  return synthesize
}
