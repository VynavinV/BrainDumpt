import { useCallback, useRef, useState, useEffect } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'

interface Props {
  node: BoardNode
}

export default function AudioNode({ node }: Props) {
  const { selectNode, updateNode } = useBoardStore()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isSelected = useBoardStore((s) => s.selectedId === node.id)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
    [node.id, node.x, node.y, selectNode]
  )

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        updateNode(node.id, { audioUrl: url })
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      console.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const togglePlay = () => {
    if (!node.audioUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(node.audioUrl)
      audioRef.current.onended = () => setIsPlaying(false)
    }
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  return (
    <div
      className={`board-node audio-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        minHeight: node.height,
        backgroundColor: node.color,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="node-header">
        <span className="node-type-icon">🎙</span>
        <span className="node-meta">{node.author}</span>
      </div>
      <div className="audio-controls">
        {isRecording ? (
          <button className="audio-btn recording" onClick={(e) => { e.stopPropagation(); stopRecording() }}>
            <span className="rec-dot" /> Stop
          </button>
        ) : (
          <button className="audio-btn" onClick={(e) => { e.stopPropagation(); startRecording() }}>
            🎤 Record
          </button>
        )}
        {node.audioUrl && (
          <button className="audio-btn" onClick={(e) => { e.stopPropagation(); togglePlay() }}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        )}
      </div>
      {node.transcript && (
        <div className="audio-transcript">{node.transcript}</div>
      )}
    </div>
  )
}
