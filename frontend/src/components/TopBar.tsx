import { useBoardStore } from '../store'

export default function TopBar() {
  const { mode, setMode } = useBoardStore()

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <div className="logo">
          <span className="logo-icon">🧠</span>
          <span className="logo-text">BrainDumpt</span>
        </div>
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
      </div>

      <div className="top-bar-right">
        <button className="synthesize-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Synthesize
        </button>
        <div className="collab-avatars">
          <div className="avatar" style={{ background: '#B8DAF0' }}>Y</div>
        </div>
      </div>
    </header>
  )
}
