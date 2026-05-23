import { useMemo } from 'react'
import type { Memory } from '../types/story'
import { compareMemoryDates, formatFlexibleDate } from './constellationEngine'

interface LetterViewProps {
  memories: Memory[]
}

export function LetterView({ memories }: LetterViewProps) {
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
