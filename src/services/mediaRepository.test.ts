import { beforeEach, describe, expect, it } from 'vitest'
import type { Memory } from '../types/story'
import { mediaRepository } from './mediaRepository'

const makeMemory = (patch: Partial<Memory> = {}): Memory => ({
  id: patch.id ?? 'unit-memory',
  title: patch.title ?? 'Unit memory',
  description: patch.description ?? 'A deterministic test memory.',
  author: patch.author ?? 'Demo',
  chapter: patch.chapter ?? 'memory-room',
  category: patch.category ?? 'daily',
  era: patch.era ?? 'present',
  place: patch.place ?? 'Demo location',
  importance: patch.importance ?? 1,
  mediaUrl: patch.mediaUrl ?? '/media/placeholders/placeholder-memory.svg',
  mediaType: patch.mediaType ?? 'image',
  mood: patch.mood ?? '#8f5cff',
  linkedMemoryId: patch.linkedMemoryId,
  date: patch.date ?? '2024-05-01',
  order: patch.order ?? 99,
  hidden: patch.hidden ?? false,
  responses: patch.responses ?? [],
  createdAt: patch.createdAt ?? '2024-05-01T00:00:00.000Z',
  updatedAt: patch.updatedAt ?? '2024-05-01T00:00:00.000Z',
})

describe('mediaRepository local fallback', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lists the seeded demo memories when Supabase is not configured', async () => {
    const memories = await mediaRepository.listMemories()

    expect(memories.length).toBeGreaterThan(8)
    expect(memories.every((memory) => memory.author)).toBe(true)
  })

  it('creates, updates, responds to, and deletes a local memory', async () => {
    await mediaRepository.saveMemory(makeMemory())
    await mediaRepository.saveMemory(makeMemory({ title: 'Updated unit memory' }))
    const response = await mediaRepository.addResponse('unit-memory', {
      memoryId: 'unit-memory',
      author: 'Demo',
      text: 'A response from the local fallback.',
    })
    const withResponse = await mediaRepository.listMemories()

    expect(response.text).toContain('local fallback')
    expect(withResponse.find((memory) => memory.id === 'unit-memory')?.title).toBe('Updated unit memory')
    expect(withResponse.find((memory) => memory.id === 'unit-memory')?.responses).toHaveLength(1)

    await mediaRepository.deleteMemory('unit-memory')
    const afterDelete = await mediaRepository.listMemories()

    expect(afterDelete.some((memory) => memory.id === 'unit-memory')).toBe(false)
  })
})
