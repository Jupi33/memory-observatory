import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Line, Sparkles, Stars } from '@react-three/drei'
import { Compass, Pencil, Plus, Route, ScrollText, Trash2, X } from 'lucide-react'
import * as THREE from 'three'
import { useAudioDirector } from '../audio/useAudioDirector'
import { useExperienceStore } from '../store/useExperienceStore'
import type { CosmicView, Memory } from '../types/story'
import {
  buildConstellationMap,
  compareMemoryDates,
  formatFlexibleDate,
  type AnchorNode,
  type ConstellationLink,
  type ConstellationMap,
  type MemoryNode,
  type Vec3,
} from './constellationEngine'

const viewLabels: Record<CosmicView, string> = {
  atlas: 'Atlas',
  trajectory: 'Trayectoria',
  letter: 'Carta',
}

const viewIcons = {
  atlas: Compass,
  trajectory: Route,
  letter: ScrollText,
}

const toneColors = {
  ivory: '#f7efe5',
  violet: '#8f5cff',
  wine: '#a83d59',
}

interface CameraRig {
  zoom: number
  pan: { x: number; y: number }
}

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

interface StarDragState {
  pointerId: number
  startX: number
  startY: number
  moved: boolean
}

type StarOffsets = Record<string, Vec3>

const toVector = (value: Vec3) => new THREE.Vector3(value[0], value[1], value[2])

const withStarOffset = (position: Vec3, nodeId: string | undefined, offsets: StarOffsets): Vec3 => {
  const offset = nodeId ? offsets[nodeId] : undefined
  return offset ? [position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]] : position
}

const nodePosition = (node: MemoryNode, view: CosmicView): Vec3 => {
  if (view === 'trajectory') return node.trajectoryPosition
  if (view === 'letter') return node.letterPosition
  return node.position
}

const anchorPosition = (anchor: AnchorNode, view: CosmicView): Vec3 => {
  if (view === 'trajectory') return anchor.trajectoryPosition
  if (view === 'letter') return [anchor.position[0] * 0.55, anchor.position[1] * 0.5, -0.7]
  return anchor.position
}

function NebulaField() {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh position={[0, 0, -7.8]} scale={[42, 24, 1]}>
      <planeGeometry args={[1, 1, 48, 48]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uViolet: { value: new THREE.Color('#2b123f') },
          uWine: { value: new THREE.Color('#7d1236') },
          uInk: { value: new THREE.Color('#050306') },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uViolet;
          uniform vec3 uWine;
          uniform vec3 uInk;
          varying vec2 vUv;

          float field(vec2 p) {
            float a = sin(p.x * 4.8 + uTime * 0.09) * 0.5 + 0.5;
            float b = sin((p.x + p.y) * 7.2 - uTime * 0.075) * 0.5 + 0.5;
            float c = sin(length(p - vec2(0.48, 0.52)) * 9.5 - uTime * 0.06) * 0.5 + 0.5;
            return a * 0.28 + b * 0.32 + c * 0.4;
          }

          void main() {
            vec2 p = vUv;
            float edge = smoothstep(0.0, 0.28, p.x) * smoothstep(1.0, 0.72, p.x) *
              smoothstep(0.0, 0.24, p.y) * smoothstep(1.0, 0.76, p.y);
            float soft = smoothstep(0.0, 0.92, 1.0 - distance(p, vec2(0.5, 0.52)));
            float dust = field(p);
            float veil = smoothstep(0.28, 0.92, dust) * (0.38 + soft * 0.62);
            vec3 color = mix(uInk, uViolet, 0.18 + veil * 0.62);
            color = mix(color, uWine, smoothstep(0.7, 1.0, dust) * (0.16 + soft * 0.2));
            float alpha = (0.54 + veil * 0.24) * edge;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  )
}

function SceneCamera({
  map,
  selectedId,
  selectedAnchorId,
  view,
  rig,
}: {
  map: ConstellationMap
  selectedId: string | null
  selectedAnchorId: string | null
  view: CosmicView
  rig: CameraRig
}) {
  const { camera, size } = useThree()
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0))

  useFrame(() => {
    const selected = selectedId ? map.memories.find((node) => node.id === selectedId) : null
    const selectedAnchor = selectedAnchorId
      ? map.anchors.find((anchor) => anchor.id === selectedAnchorId)
      : null
    const selectedPosition = selected ? toVector(nodePosition(selected, view)) : null
    const selectedAnchorPosition = selectedAnchor ? toVector(anchorPosition(selectedAnchor, view)) : null
    const mobileLift = size.width < 700 ? 2.25 : 0
    const viewZ = (view === 'trajectory' ? 7.45 : view === 'letter' ? 7.05 : 8.25) + mobileLift - rig.zoom
    const focus = selectedPosition ?? selectedAnchorPosition
    const goal = focus
      ? new THREE.Vector3(focus.x * 0.58, focus.y * 0.62, 3.75 + mobileLift * 0.42 - rig.zoom * 0.18)
      : new THREE.Vector3(rig.pan.x, (view === 'trajectory' ? 0.2 : -0.08) + rig.pan.y, viewZ)

    camera.position.lerp(goal, 0.045)
    lookAtRef.current.lerp(
      focus ?? new THREE.Vector3(rig.pan.x, (view === 'trajectory' ? 0.2 : -0.1) + rig.pan.y, -0.2),
      0.055,
    )
    camera.lookAt(lookAtRef.current)
  })

  return null
}

function OrbitRings({ view }: { view: CosmicView }) {
  const rings = useMemo(
    () =>
      [1.35, 2.15, 3.02].map((radius, ringIndex) =>
        Array.from({ length: 96 }, (_, index) => {
          const angle = (index / 95) * Math.PI * 2
          return [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.66, -0.42 - ringIndex * 0.04] as Vec3
        }),
      ),
    [],
  )

  if (view !== 'atlas') return null

  return (
    <>
      {rings.map((points, index) => (
        <Line
          key={index}
          points={points}
          color={index === 1 ? '#8f5cff' : '#f7efe5'}
          lineWidth={index === 1 ? 0.92 : 0.82}
          transparent
          opacity={index === 1 ? 0.13 : 0.075}
        />
      ))}
    </>
  )
}

function ConstellationThread({
  link,
  map,
  view,
  selectedId,
  newbornId,
  starOffsets,
}: {
  link: ConstellationLink
  map: ConstellationMap
  view: CosmicView
  selectedId: string | null
  newbornId: string | null
  starOffsets: StarOffsets
}) {
  const anchor = map.anchors.find((item) => item.id === link.sourceId || item.id === link.targetId)
  const sourceMemory = map.memories.find((item) => item.id === link.sourceId)
  const targetMemory = map.memories.find((item) => item.id === link.targetId)
  const sourceAnchor = map.anchors.find((item) => item.id === link.sourceId)
  const targetAnchor = map.anchors.find((item) => item.id === link.targetId)
  const sourceBase = sourceMemory
    ? nodePosition(sourceMemory, view)
    : sourceAnchor
      ? anchorPosition(sourceAnchor, view)
      : null
  const targetBase = targetMemory
    ? nodePosition(targetMemory, view)
    : targetAnchor
      ? anchorPosition(targetAnchor, view)
      : null
  const source = sourceBase
    ? withStarOffset(sourceBase, sourceMemory?.id ?? sourceAnchor?.id, starOffsets)
    : null
  const target = targetBase
    ? withStarOffset(targetBase, targetMemory?.id ?? targetAnchor?.id, starOffsets)
    : null

  if (!source || !target) return null

  const involved = selectedId && (link.sourceId === selectedId || link.targetId === selectedId)
  const born = newbornId && (link.sourceId === newbornId || link.targetId === newbornId)
  const muted = selectedId && !involved
  const opacity =
    view === 'letter'
      ? link.kind === 'sequence'
        ? 0.05
        : 0.1
      : born
        ? 0.72
        : link.kind === 'manual'
          ? 0.54
          : involved
            ? 0.5
            : muted
              ? 0.055
              : link.kind === 'sequence'
                ? Math.min(link.strength + 0.04, 0.11)
                : link.strength * 0.78
  const color = toneColors[link.tone] ?? (anchor ? toneColors[anchor.tone] : toneColors.ivory)
  const lineWidth =
    link.kind === 'anchor' ? 0.95 : link.kind === 'manual' ? 0.78 : link.kind === 'sequence' ? 0.9 : 0.68

  return <Line points={[source, target]} color={color} lineWidth={lineWidth} transparent opacity={opacity} />
}

function AnchorStar({
  anchor,
  view,
  selected,
  onSelect,
  onHover,
  onDragActivity,
}: {
  anchor: AnchorNode
  view: CosmicView
  selected: boolean
  onSelect: (anchor: AnchorNode) => void
  onHover: (anchor: AnchorNode | null) => void
  onDragActivity: (active: boolean, nodeId: string, offset?: Vec3) => void
}) {
  const { size } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const glowRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const dragStateRef = useRef<StarDragState | null>(null)
  const dragOffsetRef = useRef(new THREE.Vector3())
  const scratchRef = useRef(new THREE.Vector3())
  const skipClickRef = useRef(false)
  const target = useMemo(() => toVector(anchorPosition(anchor, view)), [anchor, view])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (!dragStateRef.current) dragOffsetRef.current.lerp(new THREE.Vector3(0, 0, 0), 0.18)
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

function MemoryStar({
  node,
  view,
  selected,
  newborn,
  muted,
  onSelect,
  onHover,
  onDragActivity,
}: {
  node: MemoryNode
  view: CosmicView
  selected: boolean
  newborn: boolean
  muted: boolean
  onSelect: (memory: Memory) => void
  onHover: (node: MemoryNode | null) => void
  onDragActivity: (active: boolean, nodeId: string, offset?: Vec3) => void
}) {
  const { size } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const glowRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const dragStateRef = useRef<StarDragState | null>(null)
  const dragOffsetRef = useRef(new THREE.Vector3())
  const scratchRef = useRef(new THREE.Vector3())
  const skipClickRef = useRef(false)
  const target = useMemo(() => toVector(nodePosition(node, view)), [node, view])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (!dragStateRef.current) dragOffsetRef.current.lerp(new THREE.Vector3(0, 0, 0), 0.18)
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

function MobileAtmosphereProbe({ onChange }: { onChange: (mobile: boolean) => void }) {
  const { size } = useThree()

  useEffect(() => {
    onChange(size.width < 700)
  }, [onChange, size.width])

  return null
}

function CosmicScene({
  map,
  view,
  selectedId,
  selectedAnchorId,
  newbornId,
  memoryOpen,
  rig,
  onSelect,
  onSelectAnchor,
  onHover,
  onHoverAnchor,
  onStarDrag,
  onMiss,
  starOffsets,
}: {
  map: ConstellationMap
  view: CosmicView
  selectedId: string | null
  selectedAnchorId: string | null
  newbornId: string | null
  memoryOpen: boolean
  rig: CameraRig
  onSelect: (memory: Memory) => void
  onSelectAnchor: (anchor: AnchorNode) => void
  onHover: (node: MemoryNode | null) => void
  onHoverAnchor: (anchor: AnchorNode | null) => void
  onStarDrag: (active: boolean, nodeId: string, offset?: Vec3) => void
  onMiss: () => void
  starOffsets: StarOffsets
}) {
  const [mobileAtmosphere, setMobileAtmosphere] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 700,
  )

  return (
    <Canvas
      className="cosmic-canvas"
      dpr={[1, memoryOpen && mobileAtmosphere ? 1 : mobileAtmosphere ? 1.15 : 1.75]}
      frameloop={memoryOpen && mobileAtmosphere ? 'demand' : 'always'}
      camera={{ position: [0, 0, 8.1], fov: 44, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={onMiss}
      onCreated={({ size }) => setMobileAtmosphere(size.width < 700)}
    >
      <color attach="background" args={['#050306']} />
      <fog attach="fog" args={['#050306', 8, 22]} />
      <MobileAtmosphereProbe onChange={setMobileAtmosphere} />
      <SceneCamera
        map={map}
        selectedId={selectedId}
        selectedAnchorId={selectedAnchorId}
        view={view}
        rig={rig}
      />
      <NebulaField />
      <Stars
        radius={72}
        depth={42}
        count={mobileAtmosphere ? 1900 : 3600}
        factor={mobileAtmosphere ? 4.6 : 5.3}
        saturation={0.36}
        fade
        speed={mobileAtmosphere ? 0.08 : 0.22}
      />
      <Sparkles
        count={mobileAtmosphere ? 70 : 170}
        scale={[14, 8.2, 4.4]}
        size={mobileAtmosphere ? 1.2 : 1.55}
        speed={mobileAtmosphere ? 0.05 : 0.14}
        opacity={mobileAtmosphere ? 0.22 : 0.34}
        color="#8f5cff"
      />
      <OrbitRings view={view} />
      {map.links.map((link) => (
        <ConstellationThread
          key={link.id}
          link={link}
          map={map}
          view={view}
          selectedId={selectedId}
          newbornId={newbornId}
          starOffsets={starOffsets}
        />
      ))}
      {map.anchors.map((anchor) => (
        <AnchorStar
          key={anchor.id}
          anchor={anchor}
          view={view}
          selected={selectedAnchorId === anchor.id}
          onSelect={onSelectAnchor}
          onHover={onHoverAnchor}
          onDragActivity={onStarDrag}
        />
      ))}
      {map.memories.map((node) => (
        <MemoryStar
          key={node.id}
          node={node}
          view={view}
          selected={selectedId === node.id}
          newborn={newbornId === node.id}
          muted={Boolean(selectedId && selectedId !== node.id)}
          onSelect={onSelect}
          onHover={onHover}
          onDragActivity={onStarDrag}
        />
      ))}
      {!mobileAtmosphere && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.46} luminanceThreshold={0.08} luminanceSmoothing={0.72} mipmapBlur />
          <Vignette offset={0.24} darkness={0.76} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

function TrajectoryOverlay({
  nodes,
  anchors,
  onSelect,
}: {
  nodes: MemoryNode[]
  anchors: AnchorNode[]
  onSelect: (memory: Memory) => void
}) {
  const ordered = [...nodes].sort((a, b) => compareMemoryDates(a.memory, b.memory))
  const branchOrder: Array<Memory['era']> = ['origin', 'becoming', 'present']
  const branchLabels: Record<Memory['era'], { title: string; kicker: string }> = {
    origin: { title: 'Origen', kicker: 'antes de saberlo' },
    becoming: { title: 'Convergence', kicker: 'when the sample paths begin to connect' },
    present: { title: 'Living archive', kicker: 'what keeps expanding in the demo' },
    future: { title: 'Drafts', kicker: 'optional placeholders' },
  }
  const roots = anchors.filter((anchor) => anchor.importance === 'primary').map((anchor) => anchor.title)

  return (
    <div className="cosmic-trajectory" aria-label="Trayectoria de recuerdos">
      <div className="cosmic-trajectory__header">
        <span>trayectoria ramificada</span>
        <strong>{ordered.length.toString().padStart(2, '0')} momentos</strong>
      </div>
      <div className="cosmic-trajectory__roots">
        <span>{roots[0]}</span>
        <span>{roots[1]}</span>
        <strong>03 / 06 / 2021</strong>
      </div>
      <div className="cosmic-trajectory__branches">
        {branchOrder.map((era, branchIndex) => {
          const branchNodes = ordered.filter((node) => node.memory.era === era)
          if (branchNodes.length === 0) return null
          return (
            <section key={era} className={`cosmic-trajectory__branch cosmic-trajectory__branch--${era}`}>
              <header>
                <span>acto {(branchIndex + 1).toString().padStart(2, '0')}</span>
                <strong>{branchLabels[era].title}</strong>
                <small>{branchLabels[era].kicker}</small>
              </header>
              <div>
                {branchNodes.map((node) => (
                  <button
                    type="button"
                    key={node.id}
                    className={`cosmic-trajectory__tick cosmic-trajectory__tick--${node.memory.category}`}
                    onClick={() => onSelect(node.memory)}
                  >
                    <span>{node.dateLabel}</span>
                    <strong>{node.memory.title}</strong>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function LetterOverlay({ memories }: { memories: Memory[] }) {
  const chronological = useMemo(
    () =>
      [...memories]
        .sort(compareMemoryDates)
        .map((memory) => ({ ...memory, dateLabel: formatFlexibleDate(memory.date) })),
    [memories],
  )
  const sacredCount = chronological.filter((memory) => memory.category === 'sacred').length

  return (
    <div className="cosmic-letter" aria-label="Carta viva">
      <div>
        <p>carta viva</p>
        <h2>para leerte despacio</h2>
      </div>
      <div className="cosmic-letter__paper">
        <span>
          {chronological.length.toString().padStart(2, '0')} recuerdos /{' '}
          {sacredCount.toString().padStart(2, '0')} especiales
        </span>
        <p>
          This public demo keeps the interaction model of a private memory archive without exposing personal
          media. Each star stores a date, image, note, and optional connection to another memory.
        </p>
        {chronological.map((memory, index) => (
          <p key={memory.id}>
            <strong>
              {index + 1}. {memory.title}
            </strong>
            {memory.description}
          </p>
        ))}
        <p>
          As new demo memories are added, the letter keeps rebuilding itself from the same data that powers
          the atlas.
        </p>
      </div>
    </div>
  )
}

function CosmicMemoryScene({
  memory,
  onClose,
  onEdit,
  onDelete,
}: {
  memory: Memory
  onClose: () => void
  onEdit: (memory: Memory) => void
  onDelete: (memory: Memory) => void
}) {
  const [readyState, setReadyState] = useState({ memoryId: '', ready: false })
  const ready = readyState.memoryId === memory.id && readyState.ready

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
    <aside className={`cosmic-memory${ready ? ' is-ready' : ''}`} aria-label="Recuerdo abierto">
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
        <h2>{memory.title}</h2>
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
      <CosmicScene
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
      <header className="observatory-hud">
        <div>
          <p>observatorio vivo</p>
          <span>Memory Observatory</span>
        </div>
        <strong>{visibleMemories.length.toString().padStart(2, '0')} estrellas</strong>
      </header>
      <nav className="cosmic-view-rail" aria-label="Vistas del observatorio">
        {(Object.keys(viewLabels) as CosmicView[]).map((mode) => {
          const Icon = viewIcons[mode]
          return (
            <button
              type="button"
              key={mode}
              className={view === mode ? 'is-active' : ''}
              onClick={() => setView(mode)}
              aria-label={viewLabels[mode]}
              title={viewLabels[mode]}
            >
              <Icon size={16} />
              <span>{viewLabels[mode]}</span>
            </button>
          )
        })}
      </nav>
      <button
        type="button"
        className="cosmic-add-memory"
        onClick={() => setEditMode(true)}
        aria-label="Agregar recuerdo"
      >
        <Plus size={17} />
      </button>
      <div className="cosmic-anchor-line">
        <span>Cada recuerdo enciende otro hilo del mismo cielo.</span>
      </div>
      {currentNode && (
        <div className="cosmic-star-label">
          <span>{currentNode.dateLabel}</span>
          <strong>{currentNode.memory.title}</strong>
        </div>
      )}
      {!currentNode && currentAnchor && (
        <div className="cosmic-star-label cosmic-star-label--anchor">
          <span>{currentAnchor.title}</span>
          <strong>{currentAnchor.body}</strong>
        </div>
      )}
      {newbornId && (
        <div className="cosmic-birth-flare">
          <span>Nuevo recuerdo...</span>
        </div>
      )}
      {vanishingId && (
        <div className="cosmic-delete-flare">
          <span>recuerdo eliminado</span>
        </div>
      )}
      {view === 'trajectory' && (
        <TrajectoryOverlay nodes={map.memories} anchors={map.anchors} onSelect={openMemory} />
      )}
      {view === 'letter' && <LetterOverlay memories={visibleMemories} />}
      {selectedMemory && (
        <CosmicMemoryScene
          memory={selectedMemory}
          onClose={closeMemory}
          onEdit={editMemory}
          onDelete={removeMemory}
        />
      )}
    </section>
  )
}
