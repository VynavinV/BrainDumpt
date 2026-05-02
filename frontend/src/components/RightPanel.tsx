import { useBoardStore } from '../store'

export default function RightPanel() {
  const { selectedId, nodes, rightPanelOpen, setRightPanelOpen, updateNode, mode } = useBoardStore()
  const node = nodes.find((n) => n.id === selectedId)

  if (!rightPanelOpen || !node) return null

  const typeLabels: Record<string, string> = {
    text: '📝 Text Note',
    image: '🖼 Image',
    audio: '🎙 Voice Memo',
    list: '☰ List',
    code: '<> Code Snippet',
    link: '🔗 Link',
  }

  return (
    <aside className="right-panel">
      <div className="panel-header">
        <span className="panel-type">{typeLabels[node.type] || node.type}</span>
        <button className="panel-close" onClick={() => setRightPanelOpen(false)}>✕</button>
      </div>

      {mode === 'builder' && (
        <div className="panel-section panel-shortcuts-hint">
          <span className="panel-hint">Del to delete · Esc to deselect · ? for all shortcuts</span>
        </div>
      )}

      <div className="panel-section">
        <label className="panel-label">Author</label>
        <span className="panel-value">{node.author}</span>
      </div>

      <div className="panel-section">
        <label className="panel-label">Created</label>
        <span className="panel-value">{new Date(node.createdAt).toLocaleTimeString()}</span>
      </div>

      {node.type === 'text' && (
        <div className="panel-section">
          <label className="panel-label">Content</label>
          <textarea
            className="panel-textarea"
            value={node.content}
            onChange={(e) => updateNode(node.id, { content: e.target.value })}
            placeholder="Start typing..."
          />
        </div>
      )}

      {node.type === 'code' && (
        <>
          <div className="panel-section">
            <label className="panel-label">Language</label>
            <select
              className="panel-select"
              value={node.language || 'javascript'}
              onChange={(e) => updateNode(node.id, { language: e.target.value })}
            >
              {['javascript', 'typescript', 'python', 'rust', 'go', 'java', 'css', 'html', 'json', 'sql', 'bash', 'other'].map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <div className="panel-section">
            <label className="panel-label">Code</label>
            <textarea
              className="panel-code"
              value={node.code || ''}
              onChange={(e) => updateNode(node.id, { code: e.target.value })}
              placeholder="Paste code here..."
            />
          </div>
        </>
      )}

      {node.type === 'link' && (
        <div className="panel-section">
          <label className="panel-label">URL</label>
          <input
            className="panel-input"
            value={node.linkUrl || ''}
            onChange={(e) => updateNode(node.id, { linkUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      )}

      {node.type === 'image' && (
        <div className="panel-section">
          <label className="panel-label">Image URL</label>
          <input
            className="panel-input"
            value={node.imageUrl || ''}
            onChange={(e) => updateNode(node.id, { imageUrl: e.target.value })}
            placeholder="Paste image URL or drag & drop"
          />
        </div>
      )}

      {node.type === 'audio' && (
        <div className="panel-section">
          <label className="panel-label">Transcript</label>
          <textarea
            className="panel-textarea"
            value={node.transcript || ''}
            onChange={(e) => updateNode(node.id, { transcript: e.target.value })}
            placeholder="Transcript will appear here..."
          />
        </div>
      )}

      <div className="panel-section">
        <label className="panel-label">Color</label>
        <div className="color-row">
          {(['#B9DEC8', '#BEE9DE', '#B8DAF0', '#F6D2B8', '#EFB9A6', '#E9DABF', '#F4E8B2'] as const).map((c) => (
            <button
              key={c}
              className={`color-dot ${node.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => updateNode(node.id, { color: c })}
            />
          ))}
        </div>
      </div>

      <button className="panel-delete" onClick={() => useBoardStore.getState().deleteNode(node.id)}>
        Delete Note
      </button>
    </aside>
  )
}
