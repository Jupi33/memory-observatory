import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ImagePlus, Link2, Save, X } from 'lucide-react'
import { formatFlexibleDate } from '../cosmic/constellationEngine'
import { useExperienceStore } from '../store/useExperienceStore'
import type { ChapterId, Memory, MemoryCategory, RelationshipEra } from '../types/story'

const categories: { id: MemoryCategory; label: string }[] = [
  { id: 'sacred', label: 'Especial' },
  { id: 'daily', label: 'Diario' },
]

const eras: { id: RelationshipEra; label: string }[] = [
  { id: 'origin', label: 'Origen' },
  { id: 'becoming', label: 'Convergence' },
  { id: 'present', label: 'Living archive' },
]

const moods = [
  { color: '#8f5cff', label: 'Nostalgia' },
  { color: '#d84d70', label: 'Puro amor' },
  { color: '#f2c66d', label: 'Diversión' },
  { color: '#9b9aa5', label: '¿Apagado?!' },
]

interface DateParts {
  day: string
  month: string
  year: string
}

const emptyDateParts: DateParts = { day: '', month: '', year: '' }

const onlyDigits = (value: string, maxLength: number) => value.replace(/\D/g, '').slice(0, maxLength)

const normalizeYear = (year: string) => {
  if (!year) return ''
  return year.length === 2 ? `20${year}` : year.padStart(4, '0')
}

const composeFlexibleDate = ({ day, month, year }: DateParts) => {
  if (!year) return ''
  const normalizedYear = normalizeYear(year)
  if (day && month) return `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  if (month) return `${normalizedYear}-${month.padStart(2, '0')}`
  return normalizedYear
}

const splitFlexibleDate = (value?: string): DateParts => {
  const raw = String(value ?? '').trim()
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (slash) return { day: slash[1], month: slash[2], year: slash[3] }
  const day = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (day) return { day: day[3], month: day[2], year: day[1] }
  const month = raw.match(/^(\d{4})-(\d{1,2})$/)
  if (month) return { day: '', month: month[2], year: month[1] }
  const year = raw.match(/^(\d{2}|\d{4})$/)
  if (year) return { day: '', month: '', year: year[1] }
  return emptyDateParts
}

function FlexibleDateFields({
  value,
  onChange,
  required,
}: {
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
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

function MemoryLinkPickerDialog({
  memories,
  selectedId,
  onChoose,
  onClose,
}: {
  memories: Memory[]
  selectedId?: string
  onChoose: (memoryId: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="memory-link-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Unir recuerdo"
      onClick={onClose}
    >
      <div className="memory-link-modal__panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>trazar lazo</p>
            <h3>Unir con otro recuerdo</h3>
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

export function MemoryEditorOverlay() {
  const editMode = useExperienceStore((state) => state.editMode)
  const editingMemoryId = useExperienceStore((state) => state.editingMemoryId)
  const setEditMode = useExperienceStore((state) => state.setEditMode)
  const memories = useExperienceStore((state) => state.memories)
  const createMemory = useExperienceStore((state) => state.createMemory)
  const saveMemory = useExperienceStore((state) => state.saveMemory)
  const addResponse = useExperienceStore((state) => state.addResponse)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [linkPickerMode, setLinkPickerMode] = useState<'draft' | 'selected' | null>(null)
  const [file, setFile] = useState<File | undefined>()
  const [responseText, setResponseText] = useState('')
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    author: 'Demo',
    chapter: 'memory-room' as ChapterId,
    category: 'daily' as MemoryCategory,
    era: 'present' as RelationshipEra,
    place: '',
    date: '',
    mood: '#8f5cff',
    linkedMemoryId: '',
  })

  const selected = useMemo(
    () => memories.find((memory) => memory.id === selectedId) ?? null,
    [memories, selectedId],
  )
  const visibleMemories = useMemo(
    () =>
      memories.filter(
        (memory) =>
          !memory.hidden &&
          !['memory-origin', 'memory-daily', 'memory-capsule', 'system-keepalive'].includes(memory.id),
      ),
    [memories],
  )
  const draftLinkedMemory = useMemo(
    () => visibleMemories.find((memory) => memory.id === draft.linkedMemoryId) ?? null,
    [draft.linkedMemoryId, visibleMemories],
  )
  const selectedLinkedMemory = useMemo(
    () => visibleMemories.find((memory) => memory.id === selected?.linkedMemoryId) ?? null,
    [selected?.linkedMemoryId, visibleMemories],
  )
  const draftDateIsValid = Boolean(splitFlexibleDate(draft.date).year)
  const isEditingExisting = Boolean(selected)

  useEffect(() => {
    if (!editMode) return
    const frame = window.requestAnimationFrame(() => setSelectedId(editingMemoryId))
    return () => window.cancelAnimationFrame(frame)
  }, [editMode, editingMemoryId])

  if (!editMode) return null

  const submitNew = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim() || !draftDateIsValid) return
    await createMemory({ ...draft, file })
    setDraft({
      title: '',
      description: '',
      author: 'Demo',
      chapter: 'memory-room',
      category: 'daily',
      era: 'present',
      place: '',
      date: '',
      mood: '#8f5cff',
      linkedMemoryId: '',
    })
    setFile(undefined)
    setEditMode(false)
  }

  const updateSelected = async (patch: Partial<Memory>) => {
    if (!selected) return
    await saveMemory({ ...selected, ...patch })
  }

  return (
    <aside className="memory-editor" aria-label="Editor de recuerdos">
      <div className="memory-editor__panel">
        <header className="memory-editor__header">
          <div>
            <p>archivo vivo</p>
            <h2>{isEditingExisting ? 'Editar escena' : 'Agregar escena'}</h2>
          </div>
          <button type="button" onClick={() => setEditMode(false)} aria-label="Cerrar editor">
            <X size={18} />
          </button>
        </header>

        {!isEditingExisting && (
          <form className="memory-editor__form" onSubmit={submitNew}>
            <label className="memory-editor__file">
              Foto o video
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(event) => setFile(event.currentTarget.files?.[0])}
              />
              <span>
                <ImagePlus size={17} />
                {file ? file.name : 'Seleccionar foto o video'}
              </span>
            </label>
            <label>
              Título de estrella
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Ej. Ese día..."
              />
            </label>
            <label>
              Descripción
              <textarea
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="Escribe como si fuera una línea de una carta."
              />
            </label>
            <div className="memory-editor__grid">
              <div className="memory-editor__field">
                <span>Fecha flexible</span>
                <FlexibleDateFields
                  key="new-memory-date"
                  value={draft.date}
                  onChange={(date) => setDraft({ ...draft, date })}
                  required
                />
              </div>
              <label>
                Lugar
                <input
                  value={draft.place}
                  onChange={(event) => setDraft({ ...draft, place: event.target.value })}
                  placeholder="en aquel parque..."
                />
              </label>
            </div>
            <div className="memory-editor__grid">
              <label>
                Tipo
                <select
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value as MemoryCategory })}
                >
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Etapa
                <select
                  value={draft.era}
                  onChange={(event) => setDraft({ ...draft, era: event.target.value as RelationshipEra })}
                >
                  {eras.map((era) => (
                    <option value={era.id} key={era.id}>
                      {era.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="memory-editor__moods">
              <legend>Emoción</legend>
              {moods.map((mood) => (
                <button
                  type="button"
                  key={mood.color}
                  className={draft.mood === mood.color ? 'is-selected' : ''}
                  onClick={() => setDraft({ ...draft, mood: mood.color })}
                  aria-label={mood.label}
                  title={mood.label}
                >
                  <span style={{ background: mood.color }} />
                  <small>{mood.label}</small>
                </button>
              ))}
            </fieldset>
            {visibleMemories.length > 0 && (
              <div className="memory-editor__linker">
                <button type="button" onClick={() => setLinkPickerMode('draft')}>
                  <Link2 size={15} />
                  unir con otro recuerdo...
                </button>
                <span>{draftLinkedMemory ? `Unido a ${draftLinkedMemory.title}` : 'sin unión directa'}</span>
              </div>
            )}
            <button
              className="memory-editor__primary"
              type="submit"
              disabled={!draft.title.trim() || !draftDateIsValid}
            >
              <ImagePlus size={16} />
              crear estrella
            </button>
          </form>
        )}

        {selected && (
          <section className="memory-editor__selected">
            <label>
              Título
              <input
                value={selected.title}
                onChange={(event) => void updateSelected({ title: event.target.value })}
              />
            </label>
            <label>
              Descripción
              <textarea
                value={selected.description}
                onChange={(event) => void updateSelected({ description: event.target.value })}
              />
            </label>
            <div className="memory-editor__grid">
              <div className="memory-editor__field">
                <span>Fecha flexible</span>
                <FlexibleDateFields
                  key={selected.id}
                  value={selected.date ?? ''}
                  onChange={(date) => void updateSelected({ date })}
                />
              </div>
              <label>
                Lugar
                <input
                  value={selected.place}
                  onChange={(event) => void updateSelected({ place: event.target.value })}
                  placeholder="en aquel parque..."
                />
              </label>
            </div>
            <div className="memory-editor__grid">
              <label>
                Tipo
                <select
                  value={selected.category}
                  onChange={(event) => {
                    const category = event.target.value as MemoryCategory
                    void updateSelected({ category, importance: category === 'sacred' ? 3 : 1 })
                  }}
                >
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Etapa
                <select
                  value={selected.era}
                  onChange={(event) => void updateSelected({ era: event.target.value as RelationshipEra })}
                >
                  {eras.map((era) => (
                    <option value={era.id} key={era.id}>
                      {era.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="memory-editor__moods">
              <legend>Emoción</legend>
              {moods.map((mood) => (
                <button
                  type="button"
                  key={mood.color}
                  className={selected.mood === mood.color ? 'is-selected' : ''}
                  onClick={() => void updateSelected({ mood: mood.color })}
                  aria-label={mood.label}
                  title={mood.label}
                >
                  <span style={{ background: mood.color }} />
                  <small>{mood.label}</small>
                </button>
              ))}
            </fieldset>
            <div className="memory-editor__linker">
              <button type="button" onClick={() => setLinkPickerMode('selected')}>
                <Link2 size={15} />
                unir con otro recuerdo...
              </button>
              <span>
                {selectedLinkedMemory ? `Unido a ${selectedLinkedMemory.title}` : 'sin unión directa'}
              </span>
            </div>
            <form
              className="memory-editor__response"
              onSubmit={(event) => {
                event.preventDefault()
                if (!responseText.trim()) return
                void addResponse(selected.id, 'Demo', responseText)
                setResponseText('')
              }}
            >
              <input
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
                placeholder="Responder este recuerdo..."
              />
              <button type="submit" aria-label="Guardar respuesta">
                <Save size={16} />
              </button>
            </form>
          </section>
        )}
        {linkPickerMode && (
          <MemoryLinkPickerDialog
            memories={visibleMemories.filter(
              (memory) => linkPickerMode !== 'selected' || memory.id !== selected?.id,
            )}
            selectedId={linkPickerMode === 'draft' ? draft.linkedMemoryId : selected?.linkedMemoryId}
            onClose={() => setLinkPickerMode(null)}
            onChoose={(memoryId) => {
              if (linkPickerMode === 'draft') {
                setDraft({ ...draft, linkedMemoryId: memoryId })
              } else if (selected) {
                void updateSelected({ linkedMemoryId: memoryId || undefined })
              }
              setLinkPickerMode(null)
            }}
          />
        )}
      </div>
    </aside>
  )
}
