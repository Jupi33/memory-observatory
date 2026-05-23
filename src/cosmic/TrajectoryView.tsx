import type { Memory } from '../types/story'
import { compareMemoryDates, type AnchorNode, type MemoryNode } from './constellationEngine'

interface TrajectoryViewProps {
  nodes: MemoryNode[]
  anchors: AnchorNode[]
  onSelect: (memory: Memory) => void
}

const branchOrder: Array<Memory['era']> = ['origin', 'becoming', 'present']

const branchLabels: Record<Memory['era'], { title: string; kicker: string }> = {
  origin: { title: 'Origen', kicker: 'antes de saberlo' },
  becoming: { title: 'Jupi&Nagi Universitarios', kicker: 'cuando los caminos empiezan a unirse' },
  present: { title: 'Una vida juntos', kicker: 'lo que sigue creciendo en la demo' },
  future: { title: 'Borradores', kicker: 'no usado en la demo publica' },
}

export function TrajectoryView({ nodes, anchors, onSelect }: TrajectoryViewProps) {
  const ordered = [...nodes].sort((a, b) => compareMemoryDates(a.memory, b.memory))
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
