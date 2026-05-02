import { useBoardStore } from '../store'
import { useEffect, useRef } from 'react'
import type { SynthesisGroup, SynthesisFlowStep, SynthesisConnection } from '../types'

const TYPE_ICONS: Record<string, string> = {
  core: '◆',
  detail: '○',
  question: '?',
  action: '→',
}

const TYPE_COLORS: Record<string, string> = {
  core: 'var(--text-primary)',
  detail: 'var(--text-secondary)',
  question: 'var(--warning)',
  action: 'var(--info)',
}

const CONN_COLORS: Record<string, string> = {
  supports: '#B9DEC8',
  extends: '#B8DAF0',
  contradicts: '#EFB9A6',
  inspires: '#F4E8B2',
  depends_on: '#E9DABF',
}

function FlowTree({ steps }: { steps: SynthesisFlowStep[] }) {
  const byParent = new Map<number | null, SynthesisFlowStep[]>()
  for (const step of steps) {
    const key = step.parent_step ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(step)
  }

  const roots = byParent.get(null) || []
  const getChildren = (parentStep: number): SynthesisFlowStep[] =>
    byParent.get(parentStep) || []

  function renderStep(step: SynthesisFlowStep, depth: number): React.ReactNode {
    const children = getChildren(step.step)
    const hasChildren = children.length > 0

    return (
      <div key={step.step} className="flow-step">
        <div className="flow-step-row" style={{ paddingLeft: depth * 20 }}>
          <span className="flow-tree-lines">
            {depth > 0 && '├─ '}
            {hasChildren ? '┬' : depth > 0 ? '│' : ''}
          </span>
          <span className="flow-icon" style={{ color: TYPE_COLORS[step.type] }}>
            {TYPE_ICONS[step.type] || '○'}
          </span>
          <span className="flow-title">{step.title}</span>
        </div>
        {step.description && (
          <div className="flow-desc" style={{ paddingLeft: depth * 20 + 32 }}>
            {step.description}
          </div>
        )}
        {children.map((child) => renderStep(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="flow-tree">
      {roots.map((root) => renderStep(root, 0))}
    </div>
  )
}

function GroupCard({ group }: { group: SynthesisGroup }) {
  const selectNode = useBoardStore((s) => s.selectNode)
  const setRightPanelOpen = useBoardStore((s) => s.setRightPanelOpen)
  const toggleSynthesis = useBoardStore((s) => s.toggleSynthesis)

  const handleNodeClick = (nodeId: string) => {
    toggleSynthesis()
    selectNode(nodeId)
    setRightPanelOpen(true)
  }

  return (
    <div className="synth-group-card" style={{ borderLeftColor: group.color }}>
      <div className="synth-group-header">
        <div className="synth-group-color" style={{ background: group.color }} />
        <span className="synth-group-name">{group.name}</span>
        <span className="synth-group-count">{group.node_ids.length} note{group.node_ids.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="synth-group-summary">{group.summary}</p>
      {group.flow.length > 0 && (
        <div className="synth-group-flow">
          <div className="synth-flow-label">Idea Flow</div>
          <FlowTree steps={group.flow} />
        </div>
      )}
      <div className="synth-group-nodes">
        {group.node_ids.map((id) => (
          <button key={id} className="synth-node-chip" onClick={() => handleNodeClick(id)}>
            {id.slice(0, 6)}
          </button>
        ))}
      </div>
    </div>
  )
}

function ConnectionBadge({ conn, groups }: { conn: SynthesisConnection; groups: SynthesisGroup[] }) {
  const fromGroup = groups.find((g) => g.id === conn.from_group)
  const toGroup = groups.find((g) => g.id === conn.to_group)

  return (
    <div className="synth-connection" style={{ borderColor: CONN_COLORS[conn.type] }}>
      <span className="synth-conn-from" style={{ color: fromGroup?.color }}>
        {fromGroup?.name || conn.from_group}
      </span>
      <span className="synth-conn-type" style={{ color: CONN_COLORS[conn.type] }}>
        {conn.type}
      </span>
      <span className="synth-conn-to" style={{ color: toGroup?.color }}>
        {toGroup?.name || conn.to_group}
      </span>
      <span className="synth-conn-label">{conn.label}</span>
    </div>
  )
}

export default function SynthesisPanel() {
  const showSynthesis = useBoardStore((s) => s.showSynthesis)
  const synthesisResult = useBoardStore((s) => s.synthesisResult)
  const toggleSynthesis = useBoardStore((s) => s.toggleSynthesis)
  const clearSynthesis = useBoardStore((s) => s.clearSynthesis)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = 0
    }
  }, [synthesisResult])

  if (!showSynthesis || !synthesisResult) return null

  return (
    <div className="synth-backdrop" onMouseDown={toggleSynthesis}>
      <div
        className="synth-panel"
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="synth-panel-header">
          <div className="synth-panel-title-row">
            <span className="synth-sparkle">✨</span>
            <h2 className="synth-panel-title">Synthesis</h2>
          </div>
          <div className="synth-panel-actions">
            <button className="synth-action-btn" onClick={toggleSynthesis}>Close</button>
            <button className="synth-action-btn synth-action-clear" onClick={clearSynthesis}>Clear</button>
          </div>
        </div>

        <div className="synth-content">
          {synthesisResult.summary && (
            <section className="synth-section">
              <h3 className="synth-section-title">Board Summary</h3>
              <p className="synth-summary-text">{synthesisResult.summary}</p>
            </section>
          )}

          {synthesisResult.groups.length > 0 && (
            <section className="synth-section">
              <h3 className="synth-section-title">
                Idea Islands
                <span className="synth-section-count">{synthesisResult.groups.length}</span>
              </h3>
              <div className="synth-groups">
                {synthesisResult.groups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            </section>
          )}

          {synthesisResult.connections.length > 0 && (
            <section className="synth-section">
              <h3 className="synth-section-title">
                Connections
                <span className="synth-section-count">{synthesisResult.connections.length}</span>
              </h3>
              <div className="synth-connections">
                {synthesisResult.connections.map((conn, i) => (
                  <ConnectionBadge key={i} conn={conn} groups={synthesisResult.groups} />
                ))}
              </div>
            </section>
          )}

          {synthesisResult.open_questions.length > 0 && (
            <section className="synth-section">
              <h3 className="synth-section-title">
                Open Questions
                <span className="synth-section-count">{synthesisResult.open_questions.length}</span>
              </h3>
              <ul className="synth-questions">
                {synthesisResult.open_questions.map((q, i) => (
                  <li key={i} className="synth-question-item">
                    <span className="synth-question-bullet">?</span>
                    {q}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {synthesisResult.next_steps.length > 0 && (
            <section className="synth-section">
              <h3 className="synth-section-title">
                Next Steps
                <span className="synth-section-count">{synthesisResult.next_steps.length}</span>
              </h3>
              <ul className="synth-steps">
                {synthesisResult.next_steps.map((step, i) => (
                  <li key={i} className="synth-step-item">
                    <span className="synth-step-arrow">→</span>
                    {step}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
