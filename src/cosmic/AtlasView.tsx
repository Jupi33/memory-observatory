import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import type { CosmicView, Memory } from '../types/story'
import type { AnchorNode, ConstellationMap, MemoryNode, Vec3 } from './constellationEngine'
import { NebulaField, MobileAtmosphereProbe } from './AtlasAtmosphere'
import { SceneCamera } from './AtlasCamera'
import { type CameraRig, type StarOffsets } from './AtlasPrimitives'
import { AnchorStar, MemoryStar } from './AtlasStars'
import { ConstellationThread } from './AtlasThreads'
import { OrbitLayer } from './OrbitLayer'

export type { CameraRig, StarOffsets } from './AtlasPrimitives'

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
      <OrbitLayer view={view} />
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
    </Canvas>
  )
}
