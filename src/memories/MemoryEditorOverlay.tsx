import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ImagePlus, Link2, Save, X } from 'lucide-react'
import { useModalFocus } from '../hooks/useModalFocus'
import { useExperienceStore } from '../store/useExperienceStore'
import type { ChapterId, Memory, MemoryCategory, RelationshipEra } from '../types/story'
import { FlexibleDateFields, MemoryLinkPickerDialog } from './MemoryEditorControls'
import { memoryCategories, memoryMoods, relationshipEras, splitFlexibleDate } from './memoryEditorModel'

export function MemoryEditorOverlay() {
  const panelRef = useRef<HTMLDivElement | null>(null)
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
  const closeEditor = useCallback(() => setEditMode(false), [setEditMode])

  useModalFocus({ active: editMode && !linkPickerMode, containerRef: panelRef, onClose: closeEditor })

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
    <aside className="memory-editor" role="dialog" aria-modal="true" aria-labelledby="memory-editor-title">
      <div className="memory-editor__panel" ref={panelRef} tabIndex={-1}>
        <header className="memory-editor__header">
          <div>
            <p>archivo vivo</p>
            <h2 id="memory-editor-title">{isEditingExisting ? 'Editar escena' : 'Agregar escena'}</h2>
          </div>
          <button type="button" onClick={closeEditor} aria-label="Cerrar editor">
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
                  {memoryCategories.map((category) => (
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
                  {relationshipEras.map((era) => (
                    <option value={era.id} key={era.id}>
                      {era.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="memory-editor__moods">
              <legend>Emoción</legend>
              {memoryMoods.map((mood) => (
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
                  {memoryCategories.map((category) => (
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
                  {relationshipEras.map((era) => (
                    <option value={era.id} key={era.id}>
                      {era.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="memory-editor__moods">
              <legend>Emoción</legend>
              {memoryMoods.map((mood) => (
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
