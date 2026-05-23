import { describe, expect, it } from 'vitest'
import { defaultMemories } from '../content/relationship.config'
import type { Memory } from '../types/story'
import {
  buildConstellationMap,
  compareMemoryDates,
  formatFlexibleDate,
  parseDateParts,
} from './constellationEngine'

const distance2d = (a: [number, number, number], b: [number, number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1])

describe('constellationEngine', () => {
  it('parses exact, partial, and unknown dates into stable labels and sort values', () => {
    expect(parseDateParts('30/04/22')).toMatchObject({
      label: '30 / 04 / 2022',
      precision: 'day',
    })
    expect(parseDateParts('2024-09')).toMatchObject({
      label: '09 / 2024',
      precision: 'month',
    })
    expect(parseDateParts('2025')).toMatchObject({
      label: '2025',
      precision: 'year',
    })
    expect(parseDateParts('')).toMatchObject({
      label: 'sin fecha',
      precision: 'unknown',
      sortValue: Number.POSITIVE_INFINITY,
    })
  })

  it('orders memories chronologically before falling back to manual order and title', () => {
    const memories = [
      { title: 'B', date: '2024', order: 1 },
      { title: 'A', date: '2022-03-01', order: 2 },
      { title: 'C', date: '2022-03-01', order: 1 },
    ] satisfies Array<Pick<Memory, 'date' | 'order' | 'title'>>

    expect([...memories].sort(compareMemoryDates).map((memory) => memory.title)).toEqual(['C', 'A', 'B'])
  })

  it('builds deterministic constellation nodes and links for the seeded demo library', () => {
    const first = buildConstellationMap(defaultMemories)
    const second = buildConstellationMap(defaultMemories)

    expect(first.anchors).toHaveLength(4)
    expect(first.memories).toHaveLength(defaultMemories.length)
    expect(first.links.length).toBeGreaterThan(defaultMemories.length)
    expect(second.memories.map((node) => node.position)).toEqual(first.memories.map((node) => node.position))
    expect(first.memories.map((node) => node.dateLabel)).toContain(formatFlexibleDate('2021-06-03'))
  })

  it('keeps dense demo clusters visually separated after layout relaxation', () => {
    const nodes = buildConstellationMap(defaultMemories).memories
    const minimumDistance = nodes.reduce((minimum, node, index) => {
      const rest = nodes.slice(index + 1)
      return Math.min(minimum, ...rest.map((other) => distance2d(node.position, other.position)))
    }, Number.POSITIVE_INFINITY)

    expect(minimumDistance).toBeGreaterThan(0.35)
  })
})
