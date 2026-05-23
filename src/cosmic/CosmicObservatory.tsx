import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent } from 'react'
import { useAudioDirector } from '../audio/useAudioDirector'
import { useExperienceStore } from '../store/useExperienceStore'
import type { CosmicView, Memory } from '../types/story'
import {
  buildConstellationMap,
  compareMemoryDates,
  type AnchorNode,
  type MemoryNode,
  type Vec3,
} from './constellationEngine'
import { AtlasView, type CameraRig, type StarOffsets } from './AtlasView'
import { LetterView } from './LetterView'
import { MemoryScene } from './MemoryScene'
import { ObservatoryHud } from './ObservatoryHud'
import { TrajectoryView } from './TrajectoryView'

interface DragState {
  pointerId: number
  x: number
  y: number
  moved: boolean
}

interface TrackedPointer {
  x: number
  y: number
}

interface PinchState {
  distance: number
  zoom: number
}

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
  const [cameraRig, setCameraRig] = useState<CameraRig>({ zoom: 0, pan: { x: 0, y: 0 } })
  const [starDragging, setStarDragging] = useState(false)
  const [starOffsets, setStarOffsets] = useState<StarOffsets>({})
  const starOffsetsRef = useRef<StarOffsets>({})
  const starReturnFramesRef = useRef<Record<string, number>>({})
  const starDraggingRef = useRef(false)
  const dragRef = useRef<DragState | null>(null)
  const activePointersRef = useRef(new Map<number, TrackedPointer>())
  const pinchRef = useRef<PinchState | null>(null)
  const { playCue, startPlaylist } = useAudioDirector()

  const visibleMemories = useMemo(
    () => memories.filter((memory) => !memory.hidden).sort(compareMemoryDates),
    [memories],
  )
  const map = useMemo(() => buildConstellationMap(visibleMemories), [visibleMemories])

  useEffect(() => {
    const preloaded = visibleMemories
      .filter((memory) => memory.mediaType === 'image')
      .map((memory) => {
        const image = new Image()
        image.decoding = 'async'
        image.src = memory.mediaUrl
        return image
      })

    return () => {
      preloaded.length = 0
    }
  }, [visibleMemories])

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

  useEffect(
    () => () => {
      Object.values(starReturnFramesRef.current).forEach((frame) => window.cancelAnimationFrame(frame))
    },
    [],
  )

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

  const setStarOffset = (nodeId: string, offset?: Vec3) => {
    setStarOffsets((current) => {
      const next = { ...current }
      if (!offset || Math.abs(offset[0]) + Math.abs(offset[1]) + Math.abs(offset[2]) < 0.001) {
        delete next[nodeId]
      } else {
        next[nodeId] = offset
      }
      starOffsetsRef.current = next
      return next
    })
  }

  const returnStarOffset = (nodeId: string) => {
    const from = starOffsetsRef.current[nodeId] ?? [0, 0, 0]
    const startedAt = performance.now()
    const duration = 460
    if (starReturnFramesRef.current[nodeId]) window.cancelAnimationFrame(starReturnFramesRef.current[nodeId])

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const keep = 1 - eased
      setStarOffset(nodeId, [from[0] * keep, from[1] * keep, from[2] * keep])
      if (progress < 1) {
        starReturnFramesRef.current[nodeId] = window.requestAnimationFrame(tick)
      } else {
        delete starReturnFramesRef.current[nodeId]
      }
    }

    starReturnFramesRef.current[nodeId] = window.requestAnimationFrame(tick)
  }

  const markStarDragging = (active: boolean, nodeId: string, offset?: Vec3) => {
    starDraggingRef.current = active
    setStarDragging(active)
    if (active) {
      if (starReturnFramesRef.current[nodeId])
        window.cancelAnimationFrame(starReturnFramesRef.current[nodeId])
      setStarOffset(nodeId, offset ?? [0, 0, 0])
      return
    }
    returnStarOffset(nodeId)
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

  const shouldIgnorePointerTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        'button, input, textarea, select, .memory-editor, .cosmic-memory, .cosmic-letter, .cosmic-trajectory',
      ),
    )

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (selectedMemory || shouldIgnorePointerTarget(event.target)) return
    const zoomMax = window.innerWidth < 700 ? 7.2 : 4.4
    setCameraRig((current) => ({
      ...current,
      zoom: Math.min(zoomMax, Math.max(-1.6, current.zoom - event.deltaY * 0.004)),
    }))
  }

  const adjustDesktopZoom = (direction: 1 | -1) => {
    setCameraRig((current) => ({
      ...current,
      zoom: Math.min(4.4, Math.max(-1.6, current.zoom + direction * 0.72)),
    }))
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (window.innerWidth < 700 || selectedMemory) return
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"], .memory-editor, .cosmic-memory')
      ) {
        return
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        adjustDesktopZoom(1)
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        adjustDesktopZoom(-1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMemory])

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (selectedMemory || starDraggingRef.current || shouldIgnorePointerTarget(event.target)) return
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (activePointersRef.current.size === 2) {
      const [first, second] = [...activePointersRef.current.values()]
      pinchRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        zoom: cameraRig.zoom,
      }
      dragRef.current = null
      return
    }
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (starDraggingRef.current) return
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    if (activePointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = [...activePointersRef.current.values()]
      const distance = Math.hypot(second.x - first.x, second.y - first.y)
      const delta = (distance - pinchRef.current.distance) * 0.024
      setCameraRig((current) => ({
        ...current,
        zoom: Math.min(7.2, Math.max(-1.6, pinchRef.current ? pinchRef.current.zoom + delta : current.zoom)),
      }))
      return
    }
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true
    drag.x = event.clientX
    drag.y = event.clientY
    setCameraRig((current) => ({
      ...current,
      pan: {
        x: Math.min(5.2, Math.max(-5.2, current.pan.x - dx * 0.011)),
        y: Math.min(3.8, Math.max(-4.2, current.pan.y + dy * 0.011)),
      },
    }))
  }

  const stopDrag = (event: ReactPointerEvent<HTMLElement>) => {
    activePointersRef.current.delete(event.pointerId)
    if (activePointersRef.current.size < 2) pinchRef.current = null
    const drag = dragRef.current
    if (drag?.pointerId === event.pointerId) {
      dragRef.current = null
    }
  }

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
