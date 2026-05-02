import { useBoardStore } from '../store'

export default function BottomBar() {
  const { viewport, setViewport } = useBoardStore()

  const zoomPercent = Math.round(viewport.zoom * 100)

  return (
    <footer className="bottom-bar">
      <div className="bottom-left">
        <span className="zoom-label">{zoomPercent}%</span>
      </div>
      <div className="bottom-center">
        <div className="filter-chips">
          <span className="chip active">All</span>
          <span className="chip">Text</span>
          <span className="chip">Images</span>
          <span className="chip">Audio</span>
          <span className="chip">Code</span>
        </div>
      </div>
      <div className="bottom-right">
        <div className="zoom-controls">
          <button
            className="zoom-btn"
            onClick={() => setViewport({ zoom: Math.max(viewport.zoom * 0.8, 0.15) })}
          >
            −
          </button>
          <button
            className="zoom-btn"
            onClick={() => setViewport({ zoom: 1, x: 0, y: 0 })}
          >
            ⊡
          </button>
          <button
            className="zoom-btn"
            onClick={() => setViewport({ zoom: Math.min(viewport.zoom * 1.2, 4) })}
          >
            +
          </button>
        </div>
      </div>
    </footer>
  )
}
