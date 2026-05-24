import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent } from 'react'
import type { Memory } from '../types/story'
import type { CameraRig, StarOffsets } from './AtlasView'
import type { Vec3 } from './constellationEngine'

interface DragState {
  pointerId: number
  x: number
  y: number
}

interface TrackedPointer {
  x: number
  y: number
}

interface PinchState {
  distance: number
  zoom: number
}

const ignorePointerSelector =
  'button, input, textarea, select, .memory-editor, .cosmic-memory, .cosmic-letter, .cosmic-trajectory'

const isIgnoredTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest(ignorePointerSelector))

export function useObservatoryControls({ selectedMemory }: { selectedMemory: Memory | null }) {
  const [cameraRig, setCameraRig] = useState<CameraRig>({ zoom: 0, pan: { x: 0, y: 0 } })
  const [starDragging, setStarDragging] = useState(false)
  const [starOffsets, setStarOffsets] = useState<StarOffsets>({})
  const starOffsetsRef = useRef<StarOffsets>({})
  const starReturnFramesRef = useRef<Record<string, number>>({})
  const starDraggingRef = useRef(false)
  const dragRef = useRef<DragState | null>(null)
  const activePointersRef = useRef(new Map<number, TrackedPointer>())
  const pinchRef = useRef<PinchState | null>(null)

  useEffect(
    () => () => {
      Object.values(starReturnFramesRef.current).forEach((frame) => window.cancelAnimationFrame(frame))
    },
    [],
  )

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
        setCameraRig((current) => ({
          ...current,
          zoom: Math.min(4.4, Math.max(-1.6, current.zoom + 0.72)),
        }))
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        setCameraRig((current) => ({
          ...current,
          zoom: Math.min(4.4, Math.max(-1.6, current.zoom - 0.72)),
        }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMemory])

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

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (selectedMemory || isIgnoredTarget(event.target)) return
    const zoomMax = window.innerWidth < 700 ? 7.2 : 4.4
    setCameraRig((current) => ({
      ...current,
      zoom: Math.min(zoomMax, Math.max(-1.6, current.zoom - event.deltaY * 0.004)),
    }))
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (selectedMemory || starDraggingRef.current || isIgnoredTarget(event.target)) return
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
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
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
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  return {
    cameraRig,
    handlePointerDown,
    handlePointerMove,
    handleWheel,
    markStarDragging,
    starDragging,
    starOffsets,
    stopDrag,
  }
}
