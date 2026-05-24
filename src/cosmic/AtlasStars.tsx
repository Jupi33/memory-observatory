import { useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { CosmicView, Memory } from '../types/story'
import type { AnchorNode, MemoryNode, Vec3 } from './constellationEngine'
import { anchorPosition, nodePosition, toVector, toneColors, type StarDragState } from './AtlasPrimitives'

interface StarInteractionProps {
  view: CosmicView
  onDragActivity: (active: boolean, nodeId: string, offset?: Vec3) => void
}

export function AnchorStar({
  anchor,
  view,
  selected,
  onSelect,
  onHover,
  onDragActivity,
}: StarInteractionProps & {
  anchor: AnchorNode
  selected: boolean
  onSelect: (anchor: AnchorNode) => void
  onHover: (anchor: AnchorNode | null) => void
}) {
  const { size } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const glowRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const dragStateRef = useRef<StarDragState | null>(null)
  const dragOffsetRef = useRef(new THREE.Vector3(0, 0, 0))
  const zeroRef = useRef(new THREE.Vector3(0, 0, 0))
  const scratchRef = useRef(new THREE.Vector3(0, 0, 0))
  const skipClickRef = useRef(false)
  const target = useMemo(() => toVector(anchorPosition(anchor, view)), [anchor, view])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (!dragStateRef.current) dragOffsetRef.current.lerp(zeroRef.current, 0.18)
    scratchRef.current.copy(target).add(dragOffsetRef.current)
    groupRef.current.position.lerp(scratchRef.current, dragStateRef.current ? 0.32 : 0.05)
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.15 + anchor.position[0]) * 0.035
    groupRef.current.scale.setScalar((selected ? 1.24 : 1) * pulse)
    if (materialRef.current) materialRef.current.opacity = selected ? 1 : 0.84 + pulse * 0.04
    if (glowRef.current)
      glowRef.current.opacity = selected ? 0.12 : anchor.importance === 'primary' ? 0.07 : 0.035
  })

  const handlePointerDown = (event: ThreeEvent<globalThis.PointerEvent>) => {
    event.stopPropagation()
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.nativeEvent.clientX,
      startY: event.nativeEvent.clientY,
      moved: false,
    }
    ;(event.target as unknown as { setPointerCapture?: (pointerId: number) => void }).setPointerCapture?.(
      event.pointerId,
    )
    onDragActivity(true, anchor.id, [0, 0, 0])
  }

  const handlePointerMove = (event: ThreeEvent<globalThis.PointerEvent>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    const dx = event.nativeEvent.clientX - drag.startX
    const dy = event.nativeEvent.clientY - drag.startY
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true
    const scale = size.width < 700 ? 0.0075 : 0.0095
    dragOffsetRef.current.set(dx * scale, -dy * scale, 0.04)
    onDragActivity(true, anchor.id, [
      dragOffsetRef.current.x,
      dragOffsetRef.current.y,
      dragOffsetRef.current.z,
    ])
  }

  const handlePointerUp = (event: ThreeEvent<globalThis.PointerEvent>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    skipClickRef.current = drag.moved
    dragStateRef.current = null
    ;(
      event.target as unknown as { releasePointerCapture?: (pointerId: number) => void }
    ).releasePointerCapture?.(event.pointerId)
    onDragActivity(false, anchor.id)
    window.setTimeout(() => {
      skipClickRef.current = false
    }, 120)
  }

  return (
    <group
      ref={groupRef}
      position={anchor.position}
      onClick={(event) => {
        event.stopPropagation()
        if (skipClickRef.current) return
        onSelect(anchor)
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHover(anchor)
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        onHover(null)
      }}
    >
      <mesh>
        <sphereGeometry args={[anchor.magnitude, 22, 22]} />
        <meshBasicMaterial ref={materialRef} color={toneColors[anchor.tone]} transparent opacity={0.88} />
      </mesh>
      <mesh scale={2.25}>
        <sphereGeometry args={[anchor.magnitude, 18, 18]} />
        <meshBasicMaterial
          ref={glowRef}
          color={toneColors[anchor.tone]}
          transparent
          opacity={0.035}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={[
          [-anchor.magnitude * 2.4, 0, 0],
          [anchor.magnitude * 2.4, 0, 0],
        ]}
        color={toneColors[anchor.tone]}
        lineWidth={0.42}
        transparent
        opacity={anchor.importance === 'primary' ? 0.55 : 0.34}
      />
      <Line
        points={[
          [0, -anchor.magnitude * 1.75, 0],
          [0, anchor.magnitude * 1.75, 0],
        ]}
        color={toneColors[anchor.tone]}
        lineWidth={0.3}
        transparent
        opacity={anchor.importance === 'primary' ? 0.42 : 0.26}
      />
      <mesh>
        <sphereGeometry args={[Math.max(anchor.magnitude * 2.15, 0.3), 14, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function MemoryStar({
  node,
  view,
  selected,
  newborn,
  muted,
  onSelect,
  onHover,
  onDragActivity,
}: StarInteractionProps & {
  node: MemoryNode
  selected: boolean
  newborn: boolean
  muted: boolean
  onSelect: (memory: Memory) => void
  onHover: (node: MemoryNode | null) => void
}) {
  const { size } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const glowRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const dragStateRef = useRef<StarDragState | null>(null)
  const dragOffsetRef = useRef(new THREE.Vector3(0, 0, 0))
  const zeroRef = useRef(new THREE.Vector3(0, 0, 0))
  const scratchRef = useRef(new THREE.Vector3(0, 0, 0))
  const skipClickRef = useRef(false)
  const target = useMemo(() => toVector(nodePosition(node, view)), [node, view])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (!dragStateRef.current) dragOffsetRef.current.lerp(zeroRef.current, 0.18)
    scratchRef.current.copy(target).add(dragOffsetRef.current)
    groupRef.current.position.lerp(scratchRef.current, dragStateRef.current ? 0.34 : 0.065)
    const birthPulse = newborn ? Math.max(0, Math.sin(clock.elapsedTime * 4.6) * 0.5 + 1.05) : 0
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.4 + node.position[0] * 0.7) * 0.055
    groupRef.current.scale.setScalar((selected ? 1.52 : 1) * pulse + birthPulse)

    if (materialRef.current) materialRef.current.opacity = muted ? 0.24 : selected ? 1 : 0.82
    if (glowRef.current) glowRef.current.opacity = muted ? 0.018 : selected ? 0.09 : newborn ? 0.24 : 0.036
  })

  const stopAndSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect(node.memory)
  }

  const handlePointerDown = (event: ThreeEvent<globalThis.PointerEvent>) => {
    event.stopPropagation()
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.nativeEvent.clientX,
      startY: event.nativeEvent.clientY,
      moved: false,
    }
    ;(event.target as unknown as { setPointerCapture?: (pointerId: number) => void }).setPointerCapture?.(
      event.pointerId,
    )
    onDragActivity(true, node.id, [0, 0, 0])
  }

  const handlePointerMove = (event: ThreeEvent<globalThis.PointerEvent>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    const dx = event.nativeEvent.clientX - drag.startX
    const dy = event.nativeEvent.clientY - drag.startY
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true
    const scale = size.width < 700 ? 0.0075 : 0.0095
    dragOffsetRef.current.set(dx * scale, -dy * scale, 0.04)
    onDragActivity(true, node.id, [dragOffsetRef.current.x, dragOffsetRef.current.y, dragOffsetRef.current.z])
  }

  const handlePointerUp = (event: ThreeEvent<globalThis.PointerEvent>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    skipClickRef.current = drag.moved
    dragStateRef.current = null
    ;(
      event.target as unknown as { releasePointerCapture?: (pointerId: number) => void }
    ).releasePointerCapture?.(event.pointerId)
    onDragActivity(false, node.id)
    window.setTimeout(() => {
      skipClickRef.current = false
    }, 120)
  }

  return (
    <group
      ref={groupRef}
      position={node.position}
      onClick={stopAndSelect}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHover(node)
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        onHover(null)
      }}
    >
      <mesh>
        <sphereGeometry args={[node.magnitude, 18, 18]} />
        <meshBasicMaterial ref={materialRef} color={node.tone} transparent opacity={0.82} />
      </mesh>
      <mesh scale={2.9}>
        <sphereGeometry args={[node.magnitude, 16, 16]} />
        <meshBasicMaterial ref={glowRef} color={node.tone} transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <Line
        points={[
          [-node.magnitude * 3.4, 0, 0],
          [node.magnitude * 3.4, 0, 0],
        ]}
        color={node.tone}
        lineWidth={0.28}
        transparent
        opacity={newborn ? 0.78 : 0.42}
      />
      <Line
        points={[
          [0, -node.magnitude * 2.6, 0],
          [0, node.magnitude * 2.6, 0],
        ]}
        color={node.tone}
        lineWidth={0.22}
        transparent
        opacity={newborn ? 0.62 : 0.3}
      />
      <mesh>
        <sphereGeometry args={[Math.max(node.magnitude * 3.9, 0.18), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
