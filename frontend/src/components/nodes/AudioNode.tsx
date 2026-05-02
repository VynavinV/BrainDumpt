import { useCallback, useRef, useState, useEffect } from 'react'
import type { BoardNode } from '../../types'
import { useBoardStore } from '../../store'
import { useRefine } from '../../useRefine'
import { Sparkles, Loader2 } from 'lucide-react'

interface Props {
  node: BoardNode
}

const API_URL = import.meta.env.VITE_API_URL || 'https://braindumpt-backend-production.up.railway.app'

export default function AudioNode({ node }: Props) {
  const { selectNode, updateNode } = useBoardStore()
  const refine = useRefine()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isSelected = useBoardStore((s) => s.selectedId === node.id)

  const transcribeBlob = async (blob: Blob) => {
    setIsTranscribing(true)
    try {
      const form = new FormData()
      form.append('file', blob, 'recording.webm')
      const res = await fetch(`${API_URL}/transcribe`, { method: 'POST', body: form })
      const data = await res.json()
      if (data.transcript) {
        updateNode(node.id, { transcript: data.transcript })
        refine(node.id, data.transcript)
      }
    } catch (err) {
      console.error('Transcription failed:', err)
    } finally {
      setIsTranscribing(false)
    }
  }

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
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          updateNode(node.id, { audioUrl: dataUrl })
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach((t) => t.stop())
        transcribeBlob(blob)
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

  useEffect(() => {
    if (node._autoEdit) {
      updateNode(node.id, { _autoEdit: false })
      // Delay startRecording so it falls outside effect execution
      setTimeout(() => startRecording(), 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, node._autoEdit, updateNode])

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
      if (isRecording) stopRecording()
    }
  })

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (isRecording) stopRecording()
    }
    if (e.key === 'Escape' && isRecording) {
      stopRecording()
    }
  }

  return (
    <div
      className={`board-node audio-node ${isSelected ? 'selected' : ''}`}
      style={{
        width: node.width,
        minHeight: node.height,
        backgroundColor: node.color,
      }}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div className="node-header">
        <span className="node-type-icon">🎙</span>
        <span className="node-meta flex items-center gap-1">
          {node.author}
          {node._isRefining && <Loader2 className="w-3 h-3 animate-spin ml-1 text-gray-500" />}
        </span>
      </div>
      <div className="audio-controls">
        {isRecording ? (
          <button className="audio-btn recording" onClick={(e) => { e.stopPropagation(); stopRecording() }}>
            <span className="rec-dot" /> Stop (Ctrl+Enter)
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
      {isTranscribing && (
        <div className="audio-transcript transcribing">Transcribing...</div>
      )}
      {node.transcript && !isTranscribing && (
        <div className="audio-transcript relative">
          {node.refined ? (
            <div className="whitespace-pre-wrap">
              <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
              {node.refined}
            </div>
          ) : (
            node.transcript
          )}
        </div>
      )}
    </div>
  )
}
