import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { formatFlexibleDate } from '../cosmic/constellationEngine'
import { useModalFocus } from '../hooks/useModalFocus'
import type { Memory } from '../types/story'
import { composeFlexibleDate, onlyDigits, splitFlexibleDate, type DateParts } from './memoryEditorModel'

interface FlexibleDateFieldsProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function FlexibleDateFields({ value, onChange, required }: FlexibleDateFieldsProps) {
  const [parts, setParts] = useState<DateParts>(() => splitFlexibleDate(value))

  const update = (patch: Partial<DateParts>) => {
    const next = { ...parts, ...patch }
    setParts(next)
    onChange(composeFlexibleDate(next))
  }

  return (
    <div className="memory-editor__date" aria-label="Fecha flexible">
      <label>
        Día
        <input
          inputMode="numeric"
          value={parts.day}
          onChange={(event) => update({ day: onlyDigits(event.target.value, 2) })}
          placeholder="30"
        />
      </label>
      <span>/</span>
      <label>
        Mes
        <input
          inputMode="numeric"
          value={parts.month}
          onChange={(event) => update({ month: onlyDigits(event.target.value, 2) })}
          placeholder="04"
        />
      </label>
      <span>/</span>
      <label>
        Año
        <input
          inputMode="numeric"
          value={parts.year}
          onChange={(event) => update({ year: onlyDigits(event.target.value, 4) })}
          placeholder="22"
          required={required}
        />
      </label>
    </div>
  )
}

interface MemoryLinkPickerDialogProps {
  memories: Memory[]
  selectedId?: string
  onChoose: (memoryId: string) => void
  onClose: () => void
}

export function MemoryLinkPickerDialog({
  memories,
  selectedId,
  onChoose,
  onClose,
}: MemoryLinkPickerDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  useModalFocus({ containerRef: panelRef, onClose })

  return (
    <div
      className="memory-link-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-link-title"
      onClick={onClose}
    >
      <div
        className="memory-link-modal__panel"
        ref={panelRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p>trazar lazo</p>
            <h3 id="memory-link-title">Unir con otro recuerdo</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar selector">
            <X size={17} />
          </button>
        </header>
        <button
          type="button"
          className={`memory-link-modal__clear ${!selectedId ? 'is-selected' : ''}`}
          onClick={() => onChoose('')}
        >
          sin unión directa
        </button>
        <div className="memory-link-modal__grid">
          {memories.map((memory) => (
            <button
              type="button"
              key={memory.id}
              className={selectedId === memory.id ? 'is-selected' : ''}
              onClick={() => onChoose(memory.id)}
            >
              <span className="memory-link-modal__thumb">
                {memory.mediaType === 'video' ? (
                  <video src={memory.mediaUrl} muted playsInline />
                ) : (
                  <img src={memory.mediaUrl} alt="" />
                )}
              </span>
              <small>{formatFlexibleDate(memory.date)}</small>
              <strong>{memory.title}</strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
