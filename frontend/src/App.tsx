import { useEffect, useState } from 'react'
import Canvas from './components/Canvas'
import TopBar from './components/TopBar'
import LeftRail from './components/LeftRail'
import RightPanel from './components/RightPanel'
import BottomBar from './components/BottomBar'
import NodeRenderer from './components/NodeRenderer'
import SynthesisPanel from './components/SynthesisPanel'
import IslandOverlays from './components/IslandOverlays'
import Login from './components/Login'
import RemoteCursors from './components/RemoteCursors'
import { useBoardStore } from './store'
import { boardSync } from './sync'

function getBoardIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const b = params.get('board')
  if (b) return b
  const hash = window.location.hash
  if (hash.startsWith('#/board/')) return hash.slice('#/board/'.length)
  return null
}

export default function App() {
  const nodes = useBoardStore((s) => s.nodes)
  const filter = useBoardStore((s) => s.filter)
  const mode = useBoardStore((s) => s.mode)
  const isSynthesizing = useBoardStore((s) => s.isSynthesizing)
  const username = useBoardStore((s) => s.username)
  const setUsername = useBoardStore((s) => s.setUsername)

  const [boardId, setBoardId] = useState<string | null>(() => getBoardIdFromUrl())
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    const onPop = () => {
      setBoardId(getBoardIdFromUrl())
      setJoined(false)
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [])

  const handleLoginReady = (u: string, bid: string) => {
    setUsername(u)
    if (bid !== boardId) {
      const url = new URL(window.location.href)
      url.searchParams.set('board', bid)
      window.history.replaceState({}, '', url.toString())
      setBoardId(bid)
    }
    boardSync.connect(bid, u)
    setJoined(true)
  }

  if (!joined || !boardId) {
    return (
      <Login
        initialUsername={username}
        pendingBoardId={boardId}
        onReady={handleLoginReady}
      />
    )
  }

  const visibleNodes = filter === 'all'
    ? nodes
    : nodes.filter((n) => n.type === filter)

  return (
    <div className={`shell ${mode}`}>
      <TopBar />
      <div className="shell-body">
        <LeftRail />
        <Canvas>
          {visibleNodes.map((node) => (
            <NodeRenderer key={node.id} node={node} />
          ))}
          <IslandOverlays />
          <RemoteCursors />
        </Canvas>
        <RightPanel />
      </div>
      <BottomBar />
      <SynthesisPanel />
      {isSynthesizing && (
        <div className="synth-loading-bar">
          <div className="synth-loading-fill" />
        </div>
      )}
    </div>
  )
}
