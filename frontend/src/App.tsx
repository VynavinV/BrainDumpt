import Canvas from './components/Canvas'
import TopBar from './components/TopBar'
import LeftRail from './components/LeftRail'
import RightPanel from './components/RightPanel'
import BottomBar from './components/BottomBar'
import NodeRenderer from './components/NodeRenderer'
import { useBoardStore } from './store'

export default function App() {
  const nodes = useBoardStore((s) => s.nodes)

  return (
    <div className="shell">
      <TopBar />
      <div className="shell-body">
        <LeftRail />
        <Canvas>
          {nodes.map((node) => (
            <NodeRenderer key={node.id} node={node} />
          ))}
        </Canvas>
        <RightPanel />
      </div>
      <BottomBar />
    </div>
  )
}
