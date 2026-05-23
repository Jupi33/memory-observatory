import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Line, Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { CosmicView, Memory } from '../types/story'
import {
  type AnchorNode,
  type ConstellationLink,
  type ConstellationMap,
  type MemoryNode,
  type Vec3,
} from './constellationEngine'
const toneColors = {
  ivory: '#f7efe5',
  violet: '#8f5cff',
  wine: '#a83d59',
}

export interface CameraRig {
  zoom: number
  pan: { x: number; y: number }
}

interface StarDragState {
  pointerId: number
  startX: number
  startY: number
  moved: boolean
}

export type StarOffsets = Record<string, Vec3>

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

export function AtlasView({
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
