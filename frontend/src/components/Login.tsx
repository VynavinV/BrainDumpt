import { useState } from 'react'
import { createBoard } from '../sync'

interface Props {
  initialUsername: string
  pendingBoardId: string | null
  onReady: (username: string, boardId: string) => void
}

export default function Login({ initialUsername, pendingBoardId, onReady }: Props) {
  const [username, setUsername] = useState(initialUsername)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const join = async () => {
    const u = username.trim()
    if (!u) {
      setError('Please enter a username')
      return
    }
    setBusy(true)
    setError('')
    try {
      let bid = pendingBoardId
      if (!bid) {
        const b = await createBoard('Untitled Board', u)
        bid = b.id
      }
      onReady(u, bid)
    } catch (e: any) {
      setError(e?.message || 'Failed to start board')
    } finally {
      setBusy(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') join()
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-logo">🧠 BrainDumpt</div>
        <div className="login-title">
          {pendingBoardId ? 'Join the board' : 'Start a new board'}
        </div>
        <div className="login-sub">
          {pendingBoardId
            ? 'Pick a name your collaborators will see.'
            : 'Pick a name and we will spin up a fresh board.'}
        </div>
        <input
          className="login-input"
          autoFocus
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={onKey}
          maxLength={40}
        />
        {error && <div className="login-error">{error}</div>}
        <button className="login-btn" onClick={join} disabled={busy}>
          {busy ? 'Loading…' : pendingBoardId ? 'Join board' : 'Create board'}
        </button>
        <div className="login-hint">
          {pendingBoardId
            ? `Board ID: ${pendingBoardId}`
            : 'After you create one, share the URL with anyone.'}
        </div>
      </div>
    </div>
  )
}
