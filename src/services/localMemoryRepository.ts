import { defaultMemories } from '../content/relationship.config'
import type { Memory, MemoryResponse } from '../types/story'
import type { MemoryRepository } from './memoryRepositoryTypes'

const LOCAL_KEY = 'memory-observatory.memories.v1'
const LOCAL_DELETED_KEY = 'memory-observatory.memories.deleted.v1'
const LOCAL_LIBRARY_VERSION_KEY = 'memory-observatory.memories.libraryVersion.v1'
const LOCAL_LIBRARY_VERSION = 'public-demo-2026-05-23'
const templateMemoryIds = new Set(['memory-origin', 'memory-daily', 'memory-capsule'])
const defaultMemoryIds = new Set(defaultMemories.map((memory) => memory.id))
const demoCleanupMemoryTitles = new Set([
  'Primer recuerdo real',
  'Un recuerdo de prueba',
  'Ese dia',
  'Ese día',
  'QA temporal',
])

const suspiciousFragments = [
  'prueba',
  'qa temporal',
  'rgew',
  'ergew',
  'gwegr',
  'sdf',
  'dfsdg',
  'wefwe',
  'ftyjf',
  'qwe',
]

const isTestMemory = (memory: Memory) =>
  demoCleanupMemoryTitles.has(memory.title) ||
  suspiciousFragments.some((fragment) =>
    `${memory.title} ${memory.description} ${memory.place}`.toLowerCase().includes(fragment),
  )

const filterMemory = (memory: Memory) => !templateMemoryIds.has(memory.id) && !isTestMemory(memory)

const readDeletedIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(LOCAL_DELETED_KEY) ?? '[]') as string[])
  } catch {
    return new Set<string>()
  }
}

const mergeWithDefaults = (memories: Memory[]) => {
  const byId = new Map<string, Memory>()
  const deleted = readDeletedIds()
  defaultMemories.filter((memory) => !deleted.has(memory.id)).forEach((memory) => byId.set(memory.id, memory))
  memories.filter(filterMemory).forEach((memory) => byId.set(memory.id, memory))
  return [...byId.values()].sort((a, b) => a.order - b.order)
}

export const normalizeMemory = (memory: Partial<Memory> & { id?: string }): Memory => ({
  id: String(memory.id ?? crypto.randomUUID()),
  title: String(memory.title ?? 'Recuerdo sin título'),
  description: String(memory.description ?? ''),
  author: String(memory.author ?? 'Demo'),
  chapter: memory.chapter ?? 'memory-room',
  category: memory.category ?? 'daily',
  era: memory.era ?? 'present',
  place: String(memory.place ?? 'Sin lugar'),
  importance: Number(memory.importance ?? 1),
  mediaUrl: String(memory.mediaUrl ?? '/media/placeholders/placeholder-memory.svg'),
  mediaType: memory.mediaType ?? 'image',
  mood: String(memory.mood ?? '#8f5cff'),
  linkedMemoryId: memory.linkedMemoryId ? String(memory.linkedMemoryId) : undefined,
  date: memory.date ? String(memory.date) : '',
  order: Number(memory.order ?? 0),
  hidden: Boolean(memory.hidden ?? false),
  responses: memory.responses ?? [],
  createdAt: String(memory.createdAt ?? new Date().toISOString()),
  updatedAt: String(memory.updatedAt ?? new Date().toISOString()),
})

export const readLocalMemories = (): Memory[] => {
  const raw = localStorage.getItem(LOCAL_KEY)
  if (!raw) return defaultMemories

  try {
    const storedVersion = localStorage.getItem(LOCAL_LIBRARY_VERSION_KEY)
    const parsed = (JSON.parse(raw) as Memory[]).map(normalizeMemory)
    const cleaned =
      storedVersion === LOCAL_LIBRARY_VERSION
        ? parsed.filter(filterMemory)
        : parsed.filter((memory) => !defaultMemoryIds.has(memory.id)).filter(filterMemory)
    if (cleaned.length !== parsed.length || storedVersion !== LOCAL_LIBRARY_VERSION) {
      localStorage.setItem(LOCAL_LIBRARY_VERSION_KEY, LOCAL_LIBRARY_VERSION)
      localStorage.setItem(LOCAL_KEY, JSON.stringify(cleaned))
    }
    return mergeWithDefaults(cleaned)
  } catch {
    return defaultMemories
  }
}

const writeLocalMemories = (memories: Memory[]) => {
  try {
    const deleted = readDeletedIds()
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(memories.filter((memory) => !deleted.has(memory.id)).filter(filterMemory)),
    )
  } catch (error) {
    console.warn('Local memory persistence skipped:', error)
  }
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        const image = new Image()
        image.addEventListener('load', () => {
          const maxSide = 1600
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
          const width = Math.max(1, Math.round(image.width * scale))
          const height = Math.max(1, Math.round(image.height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const context = canvas.getContext('2d')
          if (!context) {
            resolve(String(reader.result))
            return
          }
          context.drawImage(image, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.84))
        })
        image.addEventListener('error', () => resolve(String(reader.result)))
        image.src = String(reader.result)
      })
      reader.addEventListener('error', () => reject(reader.error))
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })

export const localMemoryRepository: MemoryRepository = {
  async listMemories() {
    return readLocalMemories()
  },

  async saveMemory(memory) {
    const next = { ...memory, updatedAt: new Date().toISOString() }
    const memories = readLocalMemories()
    const index = memories.findIndex((item) => item.id === next.id)
    const updated = index >= 0 ? memories.with(index, next) : [...memories, next]
    writeLocalMemories(updated.sort((a, b) => a.order - b.order))
    return next
  },

  async deleteMemory(memoryId) {
    if (defaultMemories.some((memory) => memory.id === memoryId)) {
      const deleted = readDeletedIds()
      deleted.add(memoryId)
      localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify([...deleted]))
    }
    writeLocalMemories(readLocalMemories().filter((memory) => memory.id !== memoryId))
  },

  uploadMedia: fileToDataUrl,

  async addResponse(memoryId, response) {
    const next: MemoryResponse = {
      ...response,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const memories = readLocalMemories().map((memory) =>
      memory.id === memoryId ? { ...memory, responses: [...memory.responses, next] } : memory,
    )
    writeLocalMemories(memories)
    return next
  },
}
