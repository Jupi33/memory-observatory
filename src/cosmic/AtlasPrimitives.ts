import * as THREE from 'three'
import type { CosmicView } from '../types/story'
import type { AnchorNode, MemoryNode, Vec3 } from './constellationEngine'

export const toneColors = {
  ivory: '#f7efe5',
  violet: '#8f5cff',
  wine: '#a83d59',
}

export interface CameraRig {
  zoom: number
  pan: { x: number; y: number }
}

export interface StarDragState {
  pointerId: number
  startX: number
  startY: number
  moved: boolean
}

export type StarOffsets = Record<string, Vec3>

export const copyVec3 = (target: THREE.Vector3, value: Vec3) => target.set(value[0], value[1], value[2])

export const toVector = (value: Vec3) => new THREE.Vector3(value[0], value[1], value[2])

export const withStarOffset = (position: Vec3, nodeId: string | undefined, offsets: StarOffsets): Vec3 => {
  const offset = nodeId ? offsets[nodeId] : undefined
  return offset ? [position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]] : position
}

export const nodePosition = (node: MemoryNode, view: CosmicView): Vec3 => {
  if (view === 'trajectory') return node.trajectoryPosition
  if (view === 'letter') return node.letterPosition
  return node.position
}

export const anchorPosition = (anchor: AnchorNode, view: CosmicView): Vec3 => {
  if (view === 'trajectory') return anchor.trajectoryPosition
  if (view === 'letter') return [anchor.position[0] * 0.55, anchor.position[1] * 0.5, -0.7]
  return anchor.position
}
