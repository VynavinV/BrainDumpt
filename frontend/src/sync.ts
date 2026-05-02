import { useBoardStore } from './store'
import type { BoardNode, SynthesisResult } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'https://braindumpt-backend-production.up.railway.app'
const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined)
  || API_URL.replace(/^http/, 'ws')

export interface RemoteUser {
  id: string
  username: string
  color: string
}

export interface RemoteCursor {
  user_id: string
  username: string
  color: string
  x: number
  y: number
  t: number
}

class BoardSync {
  ws: WebSocket | null = null
  boardId: string | null = null
  username: string = 'Guest'
  meId: string | null = null
  meColor: string = '#B8DAF0'
  reconnectTimer: number | null = null
  suppress = false
  cursorThrottle = 0

  connect(boardId: string, username: string) {
    this.boardId = boardId
    this.username = username
    this._open()
  }

  _open() {
    if (!this.boardId) return
    const url = `${WS_URL}/ws/${this.boardId}`
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'hello', username: this.username }))
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        this._handle(msg)
      } catch {
        // ignore
      }
    }

    ws.onclose = () => {
      this.ws = null
      if (this.reconnectTimer) return
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null
        this._open()
      }, 1500)
    }

    ws.onerror = () => {
      try { ws.close() } catch { /* */ }
    }
  }

  _handle(msg: any) {
    const store = useBoardStore.getState()
    this.suppress = true
    try {
      switch (msg.type) {
        case 'init': {
          this.meId = msg.you?.id ?? null
          this.meColor = msg.you?.color ?? '#B8DAF0'
          const state = msg.state
          const nodes: BoardNode[] = state.nodes || []
          store._setRemoteNodes(nodes)
          store._setBoardTitle(state.title || 'Untitled Board')
          store._setUsers(state.users || [])
          if (state.synthesis) {
            store.setSynthesisResult(state.synthesis)
          } else {
            store.clearSynthesis()
          }
          break
        }
        case 'node_upsert': {
          store._applyRemoteUpsert(msg.node)
          break
        }
        case 'node_patch': {
          store._applyRemotePatch(msg.id, msg.patch)
          break
        }
        case 'node_delete': {
          store._applyRemoteDelete(msg.id, msg.children || [])
          break
        }
        case 'title': {
          store._setBoardTitle(msg.title)
          break
        }
        case 'synthesis_set': {
          store.setSynthesisResult(msg.result)
          break
        }
        case 'synthesis_clear': {
          store.clearSynthesis()
          break
        }
        case 'user_joined': {
          store._addUser(msg.user)
          break
        }
        case 'user_left': {
          store._removeUser(msg.user_id)
          break
        }
        case 'cursor': {
          store._setRemoteCursor({
            user_id: msg.user_id,
            username: msg.username,
            color: msg.color,
            x: msg.x,
            y: msg.y,
            t: Date.now(),
          })
          break
        }
      }
    } finally {
      this.suppress = false
    }
  }

  _send(obj: any) {
    if (this.suppress) return
    const ws = this.ws
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(obj))
  }

  sendUpsert(node: BoardNode) {
    this._send({ type: 'node_upsert', node: this._cleanNode(node) })
  }

  sendPatch(id: string, patch: Partial<BoardNode>) {
    const clean: any = { ...patch }
    delete clean._autoEdit
    delete clean._isRefining
    this._send({ type: 'node_patch', id, patch: clean })
  }

  sendDelete(id: string) {
    this._send({ type: 'node_delete', id })
  }

  sendTitle(title: string) {
    this._send({ type: 'title', title })
  }

  sendSynthesis(result: SynthesisResult | null) {
    if (result) this._send({ type: 'synthesis_set', result })
    else this._send({ type: 'synthesis_clear' })
  }

  sendSynthesisClear() {
    this._send({ type: 'synthesis_clear' })
  }

  sendCursor(x: number, y: number) {
    const now = performance.now()
    if (now - this.cursorThrottle < 40) return
    this.cursorThrottle = now
    this._send({ type: 'cursor', x, y })
  }

  _cleanNode(n: BoardNode): any {
    const { _autoEdit, _isRefining, ...rest } = n as any
    return rest
  }
}

export const boardSync = new BoardSync()

export async function createBoard(title: string, username: string): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, username }),
  })
  if (!res.ok) throw new Error('failed to create board')
  return res.json()
}
