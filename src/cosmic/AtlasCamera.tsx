import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { CosmicView } from '../types/story'
import type { ConstellationMap } from './constellationEngine'
import { anchorPosition, copyVec3, type CameraRig, nodePosition } from './AtlasPrimitives'

export function SceneCamera({
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
  const focusRef = useRef(new THREE.Vector3(0, 0, 0))
  const goalRef = useRef(new THREE.Vector3(0, 0, 8.1))
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0))
  const lookAtGoalRef = useRef(new THREE.Vector3(0, 0, -0.2))

  useFrame(() => {
    const selected = selectedId ? map.memories.find((node) => node.id === selectedId) : null
    const selectedAnchor = selectedAnchorId
      ? map.anchors.find((anchor) => anchor.id === selectedAnchorId)
      : null
    const hasFocus = Boolean(selected || selectedAnchor)

    if (selected) {
      copyVec3(focusRef.current, nodePosition(selected, view))
    } else if (selectedAnchor) {
      copyVec3(focusRef.current, anchorPosition(selectedAnchor, view))
    }

    const mobileLift = size.width < 700 ? 2.25 : 0
    const viewZ = (view === 'trajectory' ? 7.45 : view === 'letter' ? 7.05 : 8.25) + mobileLift - rig.zoom

    if (hasFocus) {
      goalRef.current.set(
        focusRef.current.x * 0.58,
        focusRef.current.y * 0.62,
        3.75 + mobileLift * 0.42 - rig.zoom * 0.18,
      )
      lookAtGoalRef.current.copy(focusRef.current)
    } else {
      goalRef.current.set(rig.pan.x, (view === 'trajectory' ? 0.2 : -0.08) + rig.pan.y, viewZ)
      lookAtGoalRef.current.set(rig.pan.x, (view === 'trajectory' ? 0.2 : -0.1) + rig.pan.y, -0.2)
    }

    camera.position.lerp(goalRef.current, 0.045)
    lookAtRef.current.lerp(lookAtGoalRef.current, 0.055)
    camera.lookAt(lookAtRef.current)
  })

  return null
}
