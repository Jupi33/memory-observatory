import { Line } from '@react-three/drei'
import type { CosmicView } from '../types/story'
import type { ConstellationLink, ConstellationMap } from './constellationEngine'
import { anchorPosition, nodePosition, toneColors, withStarOffset, type StarOffsets } from './AtlasPrimitives'

export function ConstellationThread({
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
