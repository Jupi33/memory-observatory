import { Compass, Plus, Route, ScrollText } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { CosmicView } from '../types/story'
import type { AnchorNode, MemoryNode } from './constellationEngine'

interface ObservatoryHudProps {
  view: CosmicView
  starCount: number
  currentNode: MemoryNode | null
  currentAnchor: AnchorNode | null
  newbornId: string | null
  vanishingId: string | null
  onViewChange: Dispatch<SetStateAction<CosmicView>>
  onAddMemory: () => void
}

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

export function ObservatoryHud({
  view,
  starCount,
  currentNode,
  currentAnchor,
  newbornId,
  vanishingId,
  onViewChange,
  onAddMemory,
}: ObservatoryHudProps) {
  return (
    <>
      <header className="observatory-hud">
        <div>
          <p>observatorio vivo</p>
          <span>Memory Observatory</span>
        </div>
        <strong>{starCount.toString().padStart(2, '0')} estrellas</strong>
      </header>
      <nav className="cosmic-view-rail" aria-label="Vistas del observatorio">
        {(Object.keys(viewLabels) as CosmicView[]).map((mode) => {
          const Icon = viewIcons[mode]
          return (
            <button
              type="button"
              key={mode}
              className={view === mode ? 'is-active' : ''}
              onClick={() => onViewChange(mode)}
              aria-label={viewLabels[mode]}
              title={viewLabels[mode]}
            >
              <Icon size={16} />
              <span>{viewLabels[mode]}</span>
            </button>
          )
        })}
      </nav>
      <button type="button" className="cosmic-add-memory" onClick={onAddMemory} aria-label="Agregar recuerdo">
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
    </>
  )
}
