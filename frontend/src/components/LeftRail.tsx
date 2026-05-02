import { useBoardStore } from '../store'
import type { NodeType } from '../types'

const visionaryTools: { type: NodeType; icon: string; label: string; shortcut?: string }[] = [
  { type: 'text', icon: 'T', label: 'Text Note' },
  { type: 'image', icon: '🖼', label: 'Image' },
  { type: 'audio', icon: '🎙', label: 'Voice Memo' },
  { type: 'list', icon: '☰', label: 'List' },
]

const builderTools: { type: NodeType; icon: string; label: string; shortcut?: string }[] = [
  { type: 'text', icon: 'T', label: 'Text Note', shortcut: 'T' },
  { type: 'list', icon: '☰', label: 'List', shortcut: 'L' },
  { type: 'code', icon: '<>', label: 'Code', shortcut: 'C' },
  { type: 'image', icon: '🖼', label: 'Image', shortcut: 'I' },
  { type: 'audio', icon: '🎙', label: 'Audio', shortcut: 'A' },
  { type: 'link', icon: '🔗', label: 'Link', shortcut: 'K' },
]

export default function LeftRail() {
  const addNode = useBoardStore((s) => s.addNode)
  const mode = useBoardStore((s) => s.mode)

  const tools = mode === 'builder' ? builderTools : visionaryTools

  return (
    <aside className={`left-rail ${mode}`}>
      <div className="rail-tools">
        {tools.map((tool) => (
          <button
            key={tool.type}
            className="rail-btn"
            title={mode === 'builder' && tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
            onClick={() => addNode(tool.type)}
          >
            <span className="rail-icon">{tool.icon}</span>
            {mode === 'builder' && tool.shortcut && (
              <span className="rail-shortcut">{tool.shortcut}</span>
            )}
          </button>
        ))}
      </div>
      {mode === 'builder' && (
        <div className="rail-footer">
          <button
            className="rail-btn rail-help"
            title="Keyboard shortcuts (?)"
            onClick={() => useBoardStore.getState().setShowShortcuts(true)}
          >
            <span className="rail-icon">?</span>
          </button>
        </div>
      )}
    </aside>
  )
}
