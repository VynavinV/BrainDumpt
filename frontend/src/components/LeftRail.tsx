import { useBoardStore } from '../store'
import type { NodeType } from '../types'

const tools: { type: NodeType; icon: string; label: string }[] = [
  { type: 'text', icon: 'T', label: 'Text Note' },
  { type: 'image', icon: '🖼', label: 'Image' },
  { type: 'audio', icon: '🎙', label: 'Voice Memo' },
  { type: 'list', icon: '☰', label: 'List' },
  { type: 'code', icon: '<>', label: 'Code' },
  { type: 'link', icon: '🔗', label: 'Link' },
]

export default function LeftRail() {
  const addNode = useBoardStore((s) => s.addNode)

  return (
    <aside className="left-rail">
      <div className="rail-tools">
        {tools.map((tool) => (
          <button
            key={tool.type}
            className="rail-btn"
            title={tool.label}
            onClick={() => addNode(tool.type)}
          >
            <span className="rail-icon">{tool.icon}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
