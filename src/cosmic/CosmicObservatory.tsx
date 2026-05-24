import { useEffect, useMemo, useState } from 'react'
import { useAudioDirector } from '../audio/useAudioDirector'
import { useExperienceStore } from '../store/useExperienceStore'
import type { CosmicView, Memory } from '../types/story'
import {
  buildConstellationMap,
  compareMemoryDates,
  type AnchorNode,
  type MemoryNode,
} from './constellationEngine'
import { AccessibleMemoryList } from './AccessibleMemoryList'
import { AtlasView } from './AtlasView'
import { LetterView } from './LetterView'
import { MemoryScene } from './MemoryScene'
import { ObservatoryHud } from './ObservatoryHud'
import { TrajectoryView } from './TrajectoryView'
import { useMemoryPreload } from './useMemoryPreload'
import { useObservatoryControls } from './useObservatoryControls'

export function CosmicObservatory() {
  const memories = useExperienceStore((state) => state.memories)
  const newbornMemoryId = useExperienceStore((state) => state.newbornMemoryId)
  const vanishingMemoryId = useExperienceStore((state) => state.vanishingMemoryId)
  const acknowledgeNewborn = useExperienceStore((state) => state.acknowledgeNewborn)
  const acknowledgeVanishing = useExperienceStore((state) => state.acknowledgeVanishing)
  const loadMemories = useExperienceStore((state) => state.loadMemories)
  const deleteMemory = useExperienceStore((state) => state.deleteMemory)
  const setEditMode = useExperienceStore((state) => state.setEditMode)
  const openEditorForMemory = useExperienceStore((state) => state.openEditorForMemory)
  const [view, setView] = useState<CosmicView>('atlas')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [selectedAnchor, setSelectedAnchor] = useState<AnchorNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<MemoryNode | null>(null)
  const [hoveredAnchor, setHoveredAnchor] = useState<AnchorNode | null>(null)
  const [newbornId, setNewbornId] = useState<string | null>(null)
  const [vanishingId, setVanishingId] = useState<string | null>(null)
  const { playCue, startPlaylist } = useAudioDirector()
  const {
    cameraRig,
    handlePointerDown,
    handlePointerMove,
    handleWheel,
    markStarDragging,
    starDragging,
    starOffsets,
    stopDrag,
  } = useObservatoryControls({ selectedMemory })

  const visibleMemories = useMemo(
    () => memories.filter((memory) => !memory.hidden).sort(compareMemoryDates),
    [memories],
  )
  const map = useMemo(() => buildConstellationMap(visibleMemories), [visibleMemories])

  useMemoryPreload(visibleMemories)

  useEffect(() => {
    void loadMemories()
  }, [loadMemories])

  useEffect(() => {
    startPlaylist()
  }, [startPlaylist])

  useEffect(() => {
    document.body.style.cursor = hoveredNode ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hoveredNode])

  useEffect(() => {
    if (!newbornMemoryId) return
    let clear: number | null = null
    let draw: number | null = null
    const frame = window.requestAnimationFrame(() => {
      setView('atlas')
      setNewbornId(newbornMemoryId)
      playCue('star-born')
      draw = window.setTimeout(() => playCue('thread-draw'), 620)
      clear = window.setTimeout(() => {
        setNewbornId(null)
        acknowledgeNewborn()
      }, 5200)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      if (draw) window.clearTimeout(draw)
      if (clear) window.clearTimeout(clear)
    }
  }, [acknowledgeNewborn, newbornMemoryId, playCue])

  useEffect(() => {
    if (!vanishingMemoryId) return
    let clear: number | null = null
    const frame = window.requestAnimationFrame(() => {
      setVanishingId(vanishingMemoryId)
      playCue('crystal-break')
      clear = window.setTimeout(() => {
        setVanishingId(null)
        acknowledgeVanishing()
      }, 2600)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      if (clear) window.clearTimeout(clear)
    }
  }, [acknowledgeVanishing, playCue, vanishingMemoryId])

  const openMemory = (memory: Memory) => {
    setSelectedAnchor(null)
    setSelectedMemory(memory)
    playCue('memory-open')
  }

  const closeMemory = () => {
    setSelectedMemory(null)
  }

  const focusAnchor = (anchor: AnchorNode) => {
    setSelectedMemory(null)
    setSelectedAnchor(anchor)
    playCue('soft-click')
  }

  const removeMemory = (memory: Memory) => {
    if (!window.confirm('¿Eliminar este recuerdo de la constelación?')) return
    setSelectedMemory(null)
    void deleteMemory(memory.id)
  }

  const editMemory = (memory: Memory) => {
    setSelectedMemory(null)
    openEditorForMemory(memory.id)
  }

  const currentNode = selectedMemory
    ? (map.memories.find((node) => node.id === selectedMemory.id) ?? null)
    : hoveredNode
  const currentAnchor = selectedAnchor ?? hoveredAnchor

  return (
    <section
      className={`cosmic-observatory cosmic-observatory--${view}${starDragging ? ' is-star-dragging' : ''}${selectedMemory ? ' has-open-memory' : ''}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      <AtlasView
        map={map}
        view={view}
        selectedId={selectedMemory?.id ?? null}
        selectedAnchorId={selectedAnchor?.id ?? null}
        newbornId={newbornId}
        memoryOpen={Boolean(selectedMemory)}
        rig={cameraRig}
        onSelect={openMemory}
        onSelectAnchor={focusAnchor}
        onHover={setHoveredNode}
        onHoverAnchor={setHoveredAnchor}
        onStarDrag={markStarDragging}
        starOffsets={starOffsets}
        onMiss={() => {
          setSelectedAnchor(null)
          setSelectedMemory(null)
        }}
      />
      <div className="cosmic-grain" />
      <ObservatoryHud
        view={view}
        starCount={visibleMemories.length}
        currentNode={currentNode}
        currentAnchor={currentAnchor}
        newbornId={newbornId}
        vanishingId={vanishingId}
        onViewChange={setView}
        onAddMemory={() => setEditMode(true)}
      />
      <AccessibleMemoryList memories={visibleMemories} onOpenMemory={openMemory} />
      {view === 'trajectory' && (
        <TrajectoryView nodes={map.memories} anchors={map.anchors} onSelect={openMemory} />
      )}
      {view === 'letter' && <LetterView memories={visibleMemories} />}
      {selectedMemory && (
        <MemoryScene
          memory={selectedMemory}
          onClose={closeMemory}
          onEdit={editMemory}
          onDelete={removeMemory}
        />
      )}
    </section>
  )
}
