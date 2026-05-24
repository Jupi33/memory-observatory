import { randomUUID } from 'node:crypto'

const chapters = ['boot', 'montage', 'galaxy', 'memory-room', 'capsule'] as const
const categories = ['sacred', 'daily', 'future'] as const
const eras = ['origin', 'becoming', 'present', 'future'] as const
const mediaTypes = ['image', 'video'] as const
const allowedUploadTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const

export type PublicMemoryRow = {
  id: string
  title: string
  description: string
  author: string
  chapter: string
  category: string
  era: string
  place: string
  importance: number
  media_url: string
  media_type: string
  mood: string
  linked_memory_id: string | null
  date: string | null
  sort_order: number
  hidden: boolean
  created_at?: string
  updated_at?: string
  responses?: Array<Record<string, unknown>>
}

export type ValidatedMemory = {
  id: string
  title: string
  description: string
  author: string
  chapter: string
  category: string
  era: string
  place: string
  importance: number
  mediaUrl: string
  mediaType: string
  mood: string
  linkedMemoryId?: string
  date?: string
  order: number
  hidden: boolean
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

const asString = (value: unknown, fallback = '') => String(value ?? fallback).trim()
const asNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
const inList = <T extends readonly string[]>(value: string, list: T, fallback: T[number]): T[number] =>
  list.includes(value) ? (value as T[number]) : fallback

const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

export const validateMemoryPayload = (
  payload: Record<string, unknown>,
): ValidationResult<ValidatedMemory> => {
  const title = asString(payload.title).slice(0, 140)
  if (!title) return { ok: false, error: 'title_required' }

  const mediaUrl = asString(
    payload.mediaUrl ?? payload.media_url,
    '/media/placeholders/placeholder-memory.svg',
  )
  if (!mediaUrl) return { ok: false, error: 'media_url_required' }

  const date = asString(payload.date)
  if (date && !/^(\d{4}|\d{4}-\d{2}|\d{4}-\d{2}-\d{2})$/.test(date)) {
    return { ok: false, error: 'invalid_date_precision' }
  }

  const category = inList(asString(payload.category, 'daily'), categories, 'daily')
  return {
    ok: true,
    value: {
      id: asString(payload.id, randomUUID()).slice(0, 120),
      title,
      description: asString(payload.description).slice(0, 4000),
      author: asString(payload.author, 'Demo').slice(0, 80),
      chapter: inList(asString(payload.chapter, 'memory-room'), chapters, 'memory-room'),
      category,
      era: inList(asString(payload.era, 'present'), eras, 'present'),
      place: asString(payload.place, 'Sin lugar').slice(0, 160),
      importance: category === 'sacred' ? 3 : 1,
      mediaUrl,
      mediaType: inList(asString(payload.mediaType ?? payload.media_type, 'image'), mediaTypes, 'image'),
      mood: isHexColor(asString(payload.mood)) ? asString(payload.mood) : '#8f5cff',
      linkedMemoryId: asString(payload.linkedMemoryId ?? payload.linked_memory_id) || undefined,
      date: date || undefined,
      order: Math.max(0, Math.round(asNumber(payload.order ?? payload.sort_order, 0))),
      hidden: Boolean(payload.hidden ?? false),
    },
  }
}

export const validateResponsePayload = (payload: Record<string, unknown>) => {
  const text = asString(payload.text).slice(0, 1800)
  if (!text) return { ok: false, error: 'text_required' } as const
  return {
    ok: true,
    value: {
      id: asString(payload.id, randomUUID()).slice(0, 120),
      author: asString(payload.author, 'Demo').slice(0, 80),
      text,
    },
  } as const
}

export const validateUploadRequest = (payload: Record<string, unknown>) => {
  const fileName = asString(payload.fileName, 'memory.bin')
  const mimeType = asString(payload.mimeType)
  const size = asNumber(payload.size, 0)

  if (!allowedUploadTypes.includes(mimeType as (typeof allowedUploadTypes)[number])) {
    return { ok: false, error: 'unsupported_media_type' } as const
  }
  if (size <= 0 || size > 50 * 1024 * 1024) {
    return { ok: false, error: 'invalid_file_size' } as const
  }

  return { ok: true, value: { fileName, mimeType, size } } as const
}

export const memoryToRow = (memory: ValidatedMemory) => ({
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
  date: memory.date ?? null,
  sort_order: memory.order,
  hidden: memory.hidden,
  updated_at: new Date().toISOString(),
})

export const memoryFromRow = (row: PublicMemoryRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  author: row.author,
  chapter: row.chapter,
  category: row.category,
  era: row.era,
  place: row.place,
  importance: row.importance,
  mediaUrl: row.media_url,
  mediaType: row.media_type,
  mood: row.mood,
  linkedMemoryId: row.linked_memory_id ?? undefined,
  date: row.date ?? '',
  order: row.sort_order,
  hidden: row.hidden,
  responses: (row.responses ?? []).map((response) => ({
    id: String(response.id ?? randomUUID()),
    memoryId: String(response.memory_id ?? row.id),
    author: String(response.author ?? 'Demo'),
    text: String(response.text ?? ''),
    createdAt: String(response.created_at ?? new Date().toISOString()),
  })),
  createdAt: String(row.created_at ?? new Date().toISOString()),
  updatedAt: String(row.updated_at ?? new Date().toISOString()),
})

export const extensionForUpload = (fileName: string, mimeType: string) => {
  const extension = fileName
    .split('.')
    .pop()
    ?.replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
  if (extension) return extension
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  if (mimeType === 'video/webm') return 'webm'
  if (mimeType === 'video/quicktime') return 'mov'
  return 'mp4'
}
