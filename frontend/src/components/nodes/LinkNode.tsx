import { useState, useEffect, useCallback, useRef } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'

interface LinkPreviewData {
  url: string
  title: string
  description: string
  image: string
  favicon: string
  site_name: string
  embed_html: string
  embed_type: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://braindumpt-backend-production.up.railway.app'

interface Props {
  node: BoardNode
}

export default function LinkNode({ node }: Props) {
  const { selectNode, updateNode } = useBoardStore()
  const [isEditing, setIsEditing] = useState(() => !!node._autoEdit)
  const isSelected = useBoardStore((s) => s.selectedId === node.id)
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<LinkPreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const prevUrlRef = useRef(node.linkUrl || '')

  useEffect(() => {
    if (node._autoEdit) {
      updateNode(node.id, { _autoEdit: false })
    }
  }, [node.id, node._autoEdit, updateNode])

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isEditing])

  useEffect(() => {
    let active = true
    const url = node.linkUrl?.trim()
    if (!url || url === prevUrlRef.current) return
    prevUrlRef.current = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) return

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const fetchPreview = async () => {
      if (active) {
        setLoading(true)
        setError(false)
        setPreview(null)
        setShowEmbed(false)
      }

      try {
        const res = await fetch(`${API_BASE}/preview?url=${encodeURIComponent(url)}`, { signal: controller.signal })
        if (!res.ok) throw new Error()
        const data: LinkPreviewData = await res.json()
        if (active) {
          setPreview(data)
          if (data.embed_type === 'video') setShowEmbed(true)
        }
      } catch {
        if (active) setError(true)
      } finally {
        clearTimeout(timeout)
        if (active) setLoading(false)
      }
    }

    fetchPreview()

    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [node.linkUrl])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return
      e.stopPropagation()
      selectNode(node.id)
      const startX = e.clientX
      const startY = e.clientY
      const nodeX = node.x
      const nodeY = node.y

      const handleMove = (ev: MouseEvent) => {
        useBoardStore.getState().updateNode(node.id, {
          x: nodeX + ev.clientX - startX,
          y: nodeY + ev.clientY - startY,
        })
      }

      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [node.id, node.x, node.y, selectNode, isEditing]
  )

  const finishEditing = () => {
    setIsEditing(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      finishEditing()
    }
    if (e.key === 'Escape') {
      finishEditing()
    }
  }

  const openUrl = (e: React.MouseEvent) => {
    if (node.linkUrl) {
      window.open(node.linkUrl, '_blank', 'noopener,noreferrer')
    }
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    <div
      className={`board-node link-node ${isSelected ? 'selected' : ''}`}
      style={{
        width: node.width,
        minHeight: node.height,
        backgroundColor: node.color,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); requestAnimationFrame(() => inputRef.current?.focus()) }}
    >
      <div className="node-header">
        <span className="node-type-icon">🔗</span>
        {preview?.favicon ? (
          <img src={preview.favicon} className="link-favicon" alt="" width="14" height="14" />
        ) : null}
        <span className="node-meta link-meta-url">
          {preview?.site_name || (node.linkUrl ? new URL(node.linkUrl).hostname : '')}
        </span>
      </div>

      {isEditing ? (
        <input
          ref={inputRef}
          className="link-edit"
          value={node.linkUrl || ''}
          onChange={(e) => updateNode(node.id, { linkUrl: e.target.value })}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Paste a URL..."
        />
      ) : node.linkUrl ? (
        <div className="link-content">
          {loading && (
            <div className="link-loading">
              <div className="link-spinner" />
              <span>Fetching preview...</span>
            </div>
          )}

          {error && !loading && (
            <div className="link-error-preview" onClick={openUrl}>
              <span className="link-error-icon">!</span>
              <div>
                <div className="link-error-url">{node.linkUrl}</div>
                <div className="link-error-hint">Click to open</div>
              </div>
            </div>
          )}

          {preview && !loading && !error && (
            <>
              {showEmbed && preview.embed_html && (
                <div
                  className="link-embed"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  dangerouslySetInnerHTML={{ __html: preview.embed_html }}
                />
              )}
              {!showEmbed && preview.image && (
                <div className="link-image-wrap" onClick={openUrl}>
                  <img src={preview.image} className="link-preview-image" alt="" loading="lazy" />
                </div>
              )}
              <div className="link-info" onClick={openUrl}>
                {preview.title && <div className="link-title">{preview.title}</div>}
                {preview.description && (
                  <div className="link-description">{preview.description.slice(0, 200)}</div>
                )}
                <div className="link-url-display">{node.linkUrl}</div>
              </div>
              {preview.embed_type === 'video' && !showEmbed && (
                <button
                  className="link-play-btn"
                  onClick={(e) => { e.stopPropagation(); setShowEmbed(true) }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ▶ Play Video
                </button>
              )}
              {preview.embed_html && !showEmbed && preview.embed_type !== 'video' && (
                <button
                  className="link-play-btn"
                  onClick={(e) => { e.stopPropagation(); setShowEmbed(true) }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  Show Embed
                </button>
              )}
            </>
          )}

          {!preview && !loading && !error && node.linkUrl && (
            <div className="link-no-preview" onClick={openUrl}>
              <span className="node-placeholder">{node.linkUrl}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="link-content">
          <span className="node-placeholder">Double-click to add a link...</span>
        </div>
      )}
    </div>
  )
}
