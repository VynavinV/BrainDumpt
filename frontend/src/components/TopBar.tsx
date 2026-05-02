import { useState } from 'react'
import { useBoardStore } from '../store'
import { useSynthesis } from '../useSynthesis'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function TopBar() {
  const { mode, setMode, isSynthesizing, synthesisResult, toggleSynthesis, nodes, preLayoutPositions, revertLayout, applySynthesisLayout } = useBoardStore()
  const users = useBoardStore((s) => s.users)
  const username = useBoardStore((s) => s.username)
  const boardTitle = useBoardStore((s) => s.boardTitle)
  const setBoardTitle = useBoardStore((s) => s.setBoardTitle)
  const synthesize = useSynthesis()
  const [copied, setCopied] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(boardTitle)

  const copyShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const commitTitle = () => {
    setEditingTitle(false)
    if (titleDraft.trim() && titleDraft !== boardTitle) {
      setBoardTitle(titleDraft.trim())
    } else {
      setTitleDraft(boardTitle)
    }
  }

  const handleSynthesize = async () => {
    if (synthesisResult) {
      toggleSynthesis()
      return
    }
    if (nodes.length === 0) return
    await synthesize('BrainDumpt Board')
  }

  return (
    <header className={`top-bar ${mode}`}>
      <div className="top-bar-left">
        <div className="logo">
          <span className="logo-icon">🧠</span>
          <span className="logo-text">BrainDumpt</span>
        </div>
        {editingTitle ? (
          <input
            className="board-title-input"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle()
              if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(boardTitle) }
            }}
            maxLength={120}
          />
        ) : (
          <button
            className="board-title"
            onClick={() => { setTitleDraft(boardTitle); setEditingTitle(true) }}
            title="Rename board"
          >
            {boardTitle}
          </button>
        )}
      </div>

      <div className="top-bar-center">
        <div className="mode-switch">
          <button
            className={`mode-btn ${mode === 'visionary' ? 'active' : ''}`}
            onClick={() => setMode('visionary')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            Visionary
          </button>
          <button
            className={`mode-btn ${mode === 'builder' ? 'active' : ''}`}
            onClick={() => setMode('builder')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            Builder
          </button>
        </div>
        {mode === 'builder' && <span className="mode-badge">T L C I A K</span>}
      </div>

      <div className="top-bar-right">
        {synthesisResult && (
          <button className="view-synthesis-btn" onClick={toggleSynthesis}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            View Synthesis
          </button>
        )}
        {preLayoutPositions && (
          <button className="revert-layout-btn" onClick={revertLayout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            Scatter
          </button>
        )}
        {synthesisResult && !preLayoutPositions && (
          <button className="revert-layout-btn" onClick={applySynthesisLayout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Group
          </button>
        )}
        <button
          className={`synthesize-btn ${isSynthesizing ? 'loading' : ''}`}
          onClick={handleSynthesize}
          disabled={isSynthesizing || nodes.length === 0}
        >
          {isSynthesizing ? (
            <>
              <span className="synth-spinner" />
              Synthesizing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Synthesize
            </>
          )}
        </button>
        <div className="collab-avatars">
          {users.length === 0 && (
            <div className="avatar" style={{ background: '#B8DAF0' }} title={username || 'You'}>
              {initials(username || 'You')}
            </div>
          )}
          {users.map((u) => (
            <div
              key={u.id}
              className="avatar"
              style={{ background: u.color }}
              title={u.username}
            >
              {initials(u.username)}
            </div>
          ))}
        </div>
        <button className="share-btn" onClick={copyShare} title="Copy shareable link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>
    </header>
  )
}
