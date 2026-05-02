import { useEffect, useState } from 'react'
import { useBoardStore } from '../store'

export default function RemoteCursors() {
  const cursors = useBoardStore((s) => s.remoteCursors)
  const [, force] = useState(0)

  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 1500)
    return () => clearInterval(id)
  }, [])

  const now = Date.now()
  const entries = Object.values(cursors).filter((c) => now - c.t < 8000)

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10000 }}>
      {entries.map((c) => (
        <div
          key={c.user_id}
          className="remote-cursor"
          style={{
            position: 'absolute',
            left: c.x,
            top: c.y,
            transform: 'translate(-2px, -2px)',
            transition: 'left 80ms linear, top 80ms linear',
          }}
        >
          <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2 2 L2 18 L7 14 L10 20 L13 19 L10 13 L17 13 Z"
              fill={c.color}
              stroke="#222"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              left: 18,
              top: 16,
              padding: '2px 8px',
              borderRadius: 6,
              background: c.color,
              color: '#222',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {c.username}
          </div>
        </div>
      ))}
    </div>
  )
}
