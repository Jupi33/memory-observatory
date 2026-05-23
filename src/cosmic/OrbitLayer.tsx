import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { CosmicView } from '../types/story'
import type { Vec3 } from './constellationEngine'

interface OrbitLayerProps {
  view: CosmicView
}

export function OrbitLayer({ view }: OrbitLayerProps) {
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
