import type { Memory } from '../types/story'
import { formatFlexibleDate } from './constellationEngine'

interface AccessibleMemoryListProps {
  memories: Memory[]
  onOpenMemory: (memory: Memory) => void
}

export function AccessibleMemoryList({ memories, onOpenMemory }: AccessibleMemoryListProps) {
  return (
    <nav className="cosmic-accessible-memory-list" aria-label="Abrir recuerdos por teclado">
      <p>recuerdos accesibles</p>
      {memories.map((memory) => (
        <button type="button" key={memory.id} onClick={() => onOpenMemory(memory)}>
          <span>{formatFlexibleDate(memory.date)}</span>
          <strong>{memory.title}</strong>
        </button>
      ))}
    </nav>
  )
}
