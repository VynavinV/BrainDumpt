import { useBoardStore, type FilterType } from '../store'

const filters: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Images' },
  { value: 'audio', label: 'Audio' },
  { value: 'code', label: 'Code' },
  { value: 'list', label: 'Lists' },
  { value: 'link', label: 'Links' },
]

export default function BottomBar() {
  const { viewport, setViewport, filter, setFilter, zoomToFit } = useBoardStore()

  const zoomPercent = Math.round(viewport.zoom * 100)

  return (
    <footer className="bottom-bar">
      <div className="bottom-left">
        <span className="zoom-label">{zoomPercent}%</span>
        <button className="zoom-btn-text" onClick={zoomToFit} title="Zoom to fit (Ctrl+0)">Fit</button>
      </div>
      <div className="bottom-center">
        <div className="filter-chips">
          {filters.map((f) => (
            <button
              key={f.value}
              className={`chip ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bottom-right">
        <div className="zoom-controls">
          <button
            className="zoom-btn"
            onClick={() => setViewport({ zoom: Math.max(viewport.zoom * 0.8, 0.15) })}
            title="Zoom out (Ctrl+-)"
          >
            −
          </button>
          <button
            className="zoom-btn"
            onClick={() => setViewport({ zoom: 1, x: 0, y: 0 })}
            title="Reset zoom"
          >
            ⊡
          </button>
          <button
            className="zoom-btn"
            onClick={() => setViewport({ zoom: Math.min(viewport.zoom * 1.2, 4) })}
            title="Zoom in (Ctrl++)"
          >
            +
          </button>
        </div>
      </div>
    </footer>
  )
}
