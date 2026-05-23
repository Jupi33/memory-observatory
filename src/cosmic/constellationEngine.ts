import { relationshipMilestones } from '../content/relationship.config'
import type { DatePrecision, Memory, RelationshipMilestone } from '../types/story'

export type Vec3 = [number, number, number]

export interface ParsedMemoryDate {
  precision: DatePrecision
  sortValue: number
  label: string
}

export interface AnchorNode {
  id: string
  title: string
  body: string
  date: string
  kind: RelationshipMilestone['kind'] | 'future'
  importance: 'primary' | 'secondary'
  position: Vec3
  trajectoryPosition: Vec3
  magnitude: number
  tone: 'ivory' | 'violet' | 'wine'
}

export interface MemoryNode {
  id: string
  memory: Memory
  anchorId: string
  precision: DatePrecision
  orbit: 1 | 2 | 3
  position: Vec3
  trajectoryPosition: Vec3
  letterPosition: Vec3
  magnitude: number
  tone: string
  dateLabel: string
}

export interface ConstellationLink {
  id: string
  sourceId: string
  targetId: string
  tone: 'ivory' | 'violet' | 'wine'
  strength: number
  kind: 'anchor' | 'memory' | 'sequence' | 'manual'
}

export interface ConstellationMap {
  anchors: AnchorNode[]
  memories: MemoryNode[]
  links: ConstellationLink[]
}

const dayMs = 24 * 60 * 60 * 1000

const anchorPositions: Record<string, Vec3> = {
  'anchor-origin-a': [-4.1, 1.52, -0.3],
  'anchor-origin-b': [4.05, 1.5, -0.3],
  'anchor-convergence': [0, 0.12, 0],
  'anchor-first-light': [2.2, -1.74, -0.15],
}

const trajectoryAnchorPositions: Record<string, Vec3> = {
  'anchor-origin-a': [-2.8, 2.2, -0.2],
  'anchor-origin-b': [2.8, 2.2, -0.2],
  'anchor-convergence': [0, 0.72, 0],
  'anchor-first-light': [1.9, -0.72, -0.12],
}

const anchorTone: Record<string, AnchorNode['tone']> = {
  'anchor-origin-a': 'ivory',
  'anchor-origin-b': 'violet',
  'anchor-convergence': 'violet',
  'anchor-first-light': 'wine',
  'future-anchor': 'ivory',
}

export const parseDateParts = (date?: string): ParsedMemoryDate => {
  const raw = String(date ?? '').trim()
  if (!raw) return { precision: 'unknown', sortValue: Number.POSITIVE_INFINITY, label: 'sin fecha' }

  const normalized = raw.replace(/\//g, '-')
  const slashDayMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  const dayMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const monthMatch = normalized.match(/^(\d{4})-(\d{1,2})$/)
  const yearMatch = normalized.match(/^(\d{4})$/)

  if (slashDayMatch) {
    const [, day, month, rawYear] = slashDayMatch
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    const value = Date.UTC(Number(year), Number(month) - 1, Number(day))
    return {
      precision: 'day',
      sortValue: Number.isNaN(value) ? Number.POSITIVE_INFINITY : value,
      label: `${day.padStart(2, '0')} / ${month.padStart(2, '0')} / ${year}`,
    }
  }

  if (dayMatch) {
    const [, year, month, day] = dayMatch
    const value = Date.UTC(Number(year), Number(month) - 1, Number(day))
    return {
      precision: 'day',
      sortValue: Number.isNaN(value) ? Number.POSITIVE_INFINITY : value,
      label: `${day.padStart(2, '0')} / ${month.padStart(2, '0')} / ${year}`,
    }
  }

  if (monthMatch) {
    const [, year, month] = monthMatch
    const value = Date.UTC(Number(year), Number(month) - 1, 15)
    return {
      precision: 'month',
      sortValue: Number.isNaN(value) ? Number.POSITIVE_INFINITY : value,
      label: `${month.padStart(2, '0')} / ${year}`,
    }
  }

  if (yearMatch) {
    const [, year] = yearMatch
    const value = Date.UTC(Number(year), 6, 1)
    return {
      precision: 'year',
      sortValue: Number.isNaN(value) ? Number.POSITIVE_INFINITY : value,
      label: year,
    }
  }

  const fallback = Date.parse(raw)
  return {
    precision: Number.isNaN(fallback) ? 'unknown' : 'day',
    sortValue: Number.isNaN(fallback) ? Number.POSITIVE_INFINITY : fallback,
    label: raw,
  }
}

const hashUnit = (value: string) => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

const milestoneValue = (date: string) => parseDateParts(date).sortValue

export const compareMemoryDates = (
  a: Pick<Memory, 'date' | 'order' | 'title'>,
  b: Pick<Memory, 'date' | 'order' | 'title'>,
) => {
  const aDate = parseDateParts(a.date)
  const bDate = parseDateParts(b.date)
  return aDate.sortValue - bDate.sortValue || a.order - b.order || a.title.localeCompare(b.title)
}

const findAnchorId = (memory: Memory, parsed: ParsedMemoryDate, anchors: AnchorNode[]) => {
  if (parsed.precision === 'unknown') return 'anchor-convergence'

  const datedAnchors = anchors
  const closest = datedAnchors.reduce(
    (winner, anchor) => {
      const distance = Math.abs(parsed.sortValue - milestoneValue(anchor.date))
      return distance < winner.distance ? { id: anchor.id, distance } : winner
    },
    { id: 'anchor-convergence', distance: Number.POSITIVE_INFINITY },
  )

  const start = milestoneValue('2021-06-03')
  if (parsed.sortValue > start + 740 * dayMs && memory.category !== 'sacred') return 'anchor-convergence'
  return closest.id
}

const orbitForPrecision = (precision: DatePrecision): 1 | 2 | 3 => {
  if (precision === 'day') return 1
  if (precision === 'month') return 2
  return 3
}

const memoryWeight = (memory: Memory) => (memory.category === 'sacred' ? 3 : 1)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const orbitMaxRadius = (orbit: MemoryNode['orbit']) => {
  if (orbit === 1) return 2.72
  if (orbit === 2) return 3.32
  return 3.92
}

const orbitMinRadius = (orbit: MemoryNode['orbit']) => {
  if (orbit === 1) return 0.74
  if (orbit === 2) return 0.98
  return 1.18
}

const keepNearAnchor = (node: MemoryNode, anchor: AnchorNode) => {
  const offsetX = node.position[0] - anchor.position[0]
  const offsetY = node.position[1] - anchor.position[1]
  const distance = Math.hypot(offsetX, offsetY)
  const minRadius = orbitMinRadius(node.orbit)
  const maxRadius = orbitMaxRadius(node.orbit)

  if (distance < 0.0001) {
    const angle = hashUnit(`${node.id}:anchor-return`) * Math.PI * 2
    node.position = [
      anchor.position[0] + Math.cos(angle) * minRadius,
      anchor.position[1] + Math.sin(angle) * minRadius * 0.72,
      node.position[2],
    ]
    return
  }

  const targetDistance = clamp(distance, minRadius, maxRadius)
  if (targetDistance === distance) return
  const scale = targetDistance / distance
  node.position = [
    anchor.position[0] + offsetX * scale,
    anchor.position[1] + offsetY * scale,
    node.position[2],
  ]
}

const relaxMemoryPositions = (nodes: MemoryNode[], anchorById: Map<string, AnchorNode>) => {
  const relaxed = nodes.map((node) => ({ ...node, position: [...node.position] as Vec3 }))
  const groups = new Map<string, MemoryNode[]>()

  const pushApart = (first: MemoryNode, second: MemoryNode, baseDistance: number) => {
    const dx = second.position[0] - first.position[0]
    const dy = second.position[1] - first.position[1]
    const distance = Math.hypot(dx, dy)
    const sacredPadding = memoryWeight(first.memory) === 3 || memoryWeight(second.memory) === 3 ? 0.18 : 0
    const orbitPadding = first.orbit === second.orbit ? 0.08 : 0.04
    const minDistance = baseDistance + sacredPadding + orbitPadding

    if (distance >= minDistance) return

    const angle = distance < 0.0001 ? hashUnit(`${first.id}:${second.id}:collision`) * Math.PI * 2 : 0
    const nx = distance < 0.0001 ? Math.cos(angle) : dx / distance
    const ny = distance < 0.0001 ? Math.sin(angle) : dy / distance
    const push = (minDistance - distance) * 0.54

    first.position = [first.position[0] - nx * push, first.position[1] - ny * push, first.position[2]]
    second.position = [second.position[0] + nx * push, second.position[1] + ny * push, second.position[2]]
  }

  const keepAllNearAnchors = (group: MemoryNode[]) => {
    group.forEach((node) => {
      const anchor = anchorById.get(node.anchorId)
      if (anchor) keepNearAnchor(node, anchor)
    })
  }

  relaxed.forEach((node) => {
    const siblings = groups.get(node.anchorId) ?? []
    siblings.push(node)
    groups.set(node.anchorId, siblings)
  })

  groups.forEach((group, anchorId) => {
    const anchor = anchorById.get(anchorId)
    if (!anchor || group.length < 2) return

    for (let iteration = 0; iteration < 36; iteration += 1) {
      for (let firstIndex = 0; firstIndex < group.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < group.length; secondIndex += 1) {
          pushApart(group[firstIndex], group[secondIndex], 0.62)
        }
      }

      keepAllNearAnchors(group)
    }
  })

  for (let iteration = 0; iteration < 18; iteration += 1) {
    for (let firstIndex = 0; firstIndex < relaxed.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < relaxed.length; secondIndex += 1) {
        pushApart(relaxed[firstIndex], relaxed[secondIndex], 0.5)
      }
    }
    keepAllNearAnchors(relaxed)
  }

  return relaxed
}

const buildAnchors = (): AnchorNode[] => {
  const base = relationshipMilestones.map((milestone, index) => ({
    id: milestone.id,
    title: milestone.title,
    body: milestone.body,
    date: milestone.date,
    kind: milestone.kind,
    importance: (milestone.kind === 'birthday' || milestone.kind === 'beginning'
      ? 'primary'
      : 'secondary') as AnchorNode['importance'],
    position: anchorPositions[milestone.id] ?? [index * 1.8 - 2.7, 0, 0],
    trajectoryPosition: trajectoryAnchorPositions[milestone.id] ?? [index * 1.8 - 2.7, 0, 0],
    magnitude:
      milestone.kind === 'birthday' || milestone.kind === 'beginning'
        ? 0.13 + milestone.constellationWeight * 0.026
        : 0.076 + milestone.constellationWeight * 0.012,
    tone: anchorTone[milestone.id] ?? 'ivory',
  }))

  return base
}

export const buildConstellationMap = (memories: Memory[]): ConstellationMap => {
  const anchors = buildAnchors()
  const anchorById = new Map(anchors.map((anchor) => [anchor.id, anchor]))
  const sorted = [...memories].sort(compareMemoryDates)

  const memoriesByAnchor = new Map<string, number>()
  const initialNodes = sorted.map((memory, index) => {
    const parsed = parseDateParts(memory.date)
    const anchorId = findAnchorId(memory, parsed, anchors)
    const anchor = anchorById.get(anchorId) ?? anchors[0]
    const anchorIndex = memoriesByAnchor.get(anchorId) ?? 0
    memoriesByAnchor.set(anchorId, anchorIndex + 1)

    const orbit = orbitForPrecision(parsed.precision)
    const seed = hashUnit(`${memory.id}:${memory.title}:${memory.date ?? ''}`)
    const angle = seed * Math.PI * 2 + anchorIndex * 0.88 + (orbit - 1) * 0.72
    const precisionRadius =
      parsed.precision === 'day'
        ? 0.92
        : parsed.precision === 'month'
          ? 1.38
          : parsed.precision === 'year'
            ? 1.82
            : 2.28
    const importance = memoryWeight(memory)
    const importancePull = Math.max(0, 3 - importance) * 0.16
    const radius = precisionRadius + importancePull + (seed - 0.5) * 0.28
    const verticalScale = anchorId === 'future-anchor' ? 0.56 : 0.72
    const offset: Vec3 = [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * verticalScale,
      (seed - 0.5) * 0.72 - orbit * 0.04,
    ]

    const branch = (index % 5) - 2
    const generation = Math.floor(index / 5)
    const trajectoryX = branch * 0.86 + (seed - 0.5) * 0.22
    const trajectoryY = -0.28 - generation * 0.64 - Math.abs(branch) * 0.16
    const letterAngle = index * 0.66 + seed

    return {
      id: memory.id,
      memory,
      anchorId,
      precision: parsed.precision,
      orbit,
      position: add(anchor.position, offset),
      trajectoryPosition: [trajectoryX, trajectoryY, -0.16] as Vec3,
      letterPosition: [Math.cos(letterAngle) * 3.5, Math.sin(letterAngle * 0.72) * 1.75, -0.34] as Vec3,
      magnitude: 0.018 + importance * 0.009,
      tone:
        memory.mood ||
        (memory.category === 'future' ? '#f7efe5' : memory.category === 'sacred' ? '#8f5cff' : '#a83d59'),
      dateLabel: parsed.label,
    } satisfies MemoryNode
  })
  const nodes = relaxMemoryPositions(initialNodes, anchorById)

  const links: ConstellationLink[] = [
    {
      id: 'origin-a-convergence',
      sourceId: 'anchor-origin-a',
      targetId: 'anchor-convergence',
      tone: 'ivory',
      strength: 0.34,
      kind: 'anchor',
    },
    {
      id: 'origin-b-convergence',
      sourceId: 'anchor-origin-b',
      targetId: 'anchor-convergence',
      tone: 'violet',
      strength: 0.38,
      kind: 'anchor',
    },
    {
      id: 'convergence-first-light',
      sourceId: 'anchor-convergence',
      targetId: 'anchor-first-light',
      tone: 'wine',
      strength: 0.38,
      kind: 'anchor',
    },
  ]

  nodes.forEach((node) => {
    links.push({
      id: `anchor-${node.anchorId}-${node.id}`,
      sourceId: node.anchorId,
      targetId: node.id,
      tone: node.memory.category === 'sacred' ? 'violet' : 'wine',
      strength: 0.18 + memoryWeight(node.memory) * 0.05,
      kind: 'memory',
    })
  })

  nodes.forEach((node) => {
    if (!node.memory.linkedMemoryId || !nodes.some((item) => item.id === node.memory.linkedMemoryId)) return
    links.push({
      id: `manual-${node.id}-${node.memory.linkedMemoryId}`,
      sourceId: node.id,
      targetId: node.memory.linkedMemoryId,
      tone: 'violet',
      strength: 0.34,
      kind: 'manual',
    })
  })

  for (let index = 1; index < nodes.length; index += 1) {
    links.push({
      id: `sequence-${nodes[index - 1].id}-${nodes[index].id}`,
      sourceId: nodes[index - 1].id,
      targetId: nodes[index].id,
      tone: 'ivory',
      strength: 0.1,
      kind: 'sequence',
    })
  }

  return { anchors, memories: nodes, links }
}

export const formatFlexibleDate = (date?: string) => parseDateParts(date).label
