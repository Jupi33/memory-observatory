import { defaultMemories } from '../content/relationship.config'
import type { Memory, MemoryResponse } from '../types/story'
import { hasSupabaseConfig, mediaBucket, supabase } from './supabase'

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

const normalizeMemory = (memory: Partial<Memory> & { id?: string }): Memory => ({
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

const asPublicMemory = (row: Record<string, unknown>): Memory =>
  normalizeMemory({
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    author: String(row.author ?? 'Demo'),
    chapter: (row.chapter as Memory['chapter']) ?? 'memory-room',
    category: (row.category as Memory['category']) ?? 'daily',
    era: (row.era as Memory['era']) ?? 'present',
    place: String(row.place ?? 'Sin lugar'),
    importance: Number(row.importance ?? 1),
    mediaUrl: String(row.media_url ?? row.mediaUrl ?? ''),
    mediaType: (row.media_type as Memory['mediaType']) ?? 'image',
    mood: String(row.mood ?? '#8f5cff'),
    linkedMemoryId: row.linked_memory_id ? String(row.linked_memory_id) : undefined,
    date: row.date ? String(row.date) : '',
    order: Number(row.sort_order ?? row.order ?? 0),
    hidden: Boolean(row.hidden ?? false),
    responses: ((row.responses as MemoryResponse[] | undefined) ?? []).map((response) => response),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  })

const asSupabaseRow = (memory: Memory) => ({
  id: memory.id,
  title: memory.title,
  description: memory.description,
  author: memory.author,
  chapter: memory.chapter,
  category: memory.category,
  era: memory.era,
  place: memory.place,
  importance: memory.importance,
  media_url: memory.mediaUrl,
  media_type: memory.mediaType,
  mood: memory.mood,
  linked_memory_id: memory.linkedMemoryId ?? null,
  date: memory.date || null,
  sort_order: memory.order,
  hidden: memory.hidden ?? false,
  updated_at: memory.updatedAt,
})

const readLocal = (): Memory[] => {
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

const writeLocal = (memories: Memory[]) => {
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

export const mediaRepository = {
  async listMemories(): Promise<Memory[]> {
    if (!hasSupabaseConfig || !supabase) return readLocal()

    const { data, error } = await supabase
      .from('memories')
      .select('*, responses(*)')
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('Supabase list fallback:', error.message)
      return readLocal()
    }

    return mergeWithDefaults(data.map(asPublicMemory))
  },

  async saveMemory(memory: Memory): Promise<Memory> {
    const next = { ...memory, updatedAt: new Date().toISOString() }

    if (!hasSupabaseConfig || !supabase) {
      const memories = readLocal()
      const index = memories.findIndex((item) => item.id === next.id)
      const updated = index >= 0 ? memories.with(index, next) : [...memories, next]
      writeLocal(updated.sort((a, b) => a.order - b.order))
      return next
    }

    const { error } = await supabase.from('memories').upsert(asSupabaseRow(next))

    if (error) {
      console.warn('Supabase save fallback:', error.message)
      const memories = readLocal()
      writeLocal([...memories.filter((item) => item.id !== next.id), next])
    }

    return next
  },

  async deleteMemory(memoryId: string): Promise<void> {
    if (!hasSupabaseConfig || !supabase) {
      if (defaultMemories.some((memory) => memory.id === memoryId)) {
        const deleted = readDeletedIds()
        deleted.add(memoryId)
        localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify([...deleted]))
      }
      writeLocal(readLocal().filter((memory) => memory.id !== memoryId))
      return
    }

    const defaultMemory = defaultMemories.find((memory) => memory.id === memoryId)
    if (defaultMemory) {
      const tombstone = normalizeMemory({
        ...defaultMemory,
        hidden: true,
        updatedAt: new Date().toISOString(),
      })
      const { error } = await supabase.from('memories').upsert(asSupabaseRow(tombstone))
      if (error) {
        console.warn('Supabase default delete fallback:', error.message)
        writeLocal(readLocal().filter((memory) => memory.id !== memoryId))
      }
      return
    }

    const { error } = await supabase.from('memories').delete().eq('id', memoryId)
    if (error) {
      console.warn('Supabase delete fallback:', error.message)
      writeLocal(readLocal().filter((memory) => memory.id !== memoryId))
    }
  },

  async uploadMedia(file: File): Promise<string> {
    if (!hasSupabaseConfig || !supabase) return fileToDataUrl(file)

    const extension = file.name.split('.').pop() ?? 'bin'
    const path = `uploads/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from(mediaBucket).upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    })

    if (error) {
      console.warn('Supabase upload fallback:', error.message)
      return fileToDataUrl(file)
    }

    const { data } = supabase.storage.from(mediaBucket).getPublicUrl(path)
    return data.publicUrl
  },

  async addResponse(memoryId: string, response: Omit<MemoryResponse, 'id' | 'createdAt'>) {
    const next: MemoryResponse = {
      ...response,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }

    if (!hasSupabaseConfig || !supabase) {
      const memories = readLocal().map((memory) =>
        memory.id === memoryId ? { ...memory, responses: [...memory.responses, next] } : memory,
      )
      writeLocal(memories)
      return next
    }

    const { error } = await supabase.from('responses').insert({
      id: next.id,
      memory_id: memoryId,
      author: next.author,
      text: next.text,
      created_at: next.createdAt,
    })

    if (error) console.warn('Supabase response fallback:', error.message)
    return next
  },
}
