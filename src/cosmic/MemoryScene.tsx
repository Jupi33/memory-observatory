import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { useModalFocus } from '../hooks/useModalFocus'
import type { Memory } from '../types/story'
import { formatFlexibleDate } from './constellationEngine'

interface MemorySceneProps {
  memory: Memory
  onClose: () => void
  onEdit: (memory: Memory) => void
  onDelete: (memory: Memory) => void
}

export function MemoryScene({ memory, onClose, onEdit, onDelete }: MemorySceneProps) {
  const dialogRef = useRef<HTMLElement | null>(null)
  const [readyState, setReadyState] = useState({ memoryId: '', ready: false })
  const ready = readyState.memoryId === memory.id && readyState.ready

  useModalFocus({ containerRef: dialogRef, onClose })

  useEffect(() => {
    let timeout: number | null = null
    const frame = window.requestAnimationFrame(() => {
      timeout = window.setTimeout(() => setReadyState({ memoryId: memory.id, ready: true }), 180)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      if (timeout) window.clearTimeout(timeout)
    }
  }, [memory.id])

  return (
    <aside
      ref={dialogRef}
      className={`cosmic-memory${ready ? ' is-ready' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cosmic-memory-title"
      tabIndex={-1}
    >
      <div className="cosmic-memory__actions">
        <button
          type="button"
          className="cosmic-memory__edit"
          onClick={() => onEdit(memory)}
          aria-label="Editar recuerdo"
        >
          <Pencil size={15} />
          <span>editar</span>
        </button>
        <button
          type="button"
          className="cosmic-memory__delete"
          onClick={() => onDelete(memory)}
          aria-label="Eliminar recuerdo"
        >
          <Trash2 size={16} />
          <span>eliminar</span>
        </button>
        <button type="button" className="cosmic-memory__close" onClick={onClose} aria-label="Cerrar recuerdo">
          <X size={18} />
        </button>
      </div>
      <div className="cosmic-memory__media">
        {memory.mediaType === 'video' ? (
          <video src={memory.mediaUrl} controls playsInline />
        ) : (
          <>
            <img className="cosmic-memory__backdrop" src={memory.mediaUrl} alt="" aria-hidden />
            <img className="cosmic-memory__image" src={memory.mediaUrl} alt={memory.title} />
          </>
        )}
      </div>
      <div className="cosmic-memory__copy">
        <p>
          {formatFlexibleDate(memory.date)} / {memory.place || 'sin lugar'}
        </p>
        <h2 id="cosmic-memory-title">{memory.title}</h2>
        <span>{memory.description}</span>
        {memory.responses.length > 0 && (
          <div className="cosmic-memory__responses">
            {memory.responses.map((response) => (
              <blockquote key={response.id}>
                {response.text}
                <cite>{response.author}</cite>
              </blockquote>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
