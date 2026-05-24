import { describe, expect, it } from 'vitest'
import { validateMemoryPayload, validateResponsePayload, validateUploadRequest } from './memoryPayload'

describe('memory payload validation', () => {
  it('accepts a valid exact-date memory and normalizes importance from category', () => {
    const result = validateMemoryPayload({
      id: 'memory-1',
      title: 'A demo memory',
      description: 'Short text',
      mediaUrl: '/media/placeholders/placeholder-memory.svg',
      category: 'sacred',
      date: '2026-04-30',
      order: 4,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.importance).toBe(3)
      expect(result.value.date).toBe('2026-04-30')
    }
  })

  it('rejects malformed flexible dates', () => {
    const result = validateMemoryPayload({
      title: 'Bad date',
      mediaUrl: '/media/placeholders/placeholder-memory.svg',
      date: '30/04/2026',
    })

    expect(result).toEqual({ ok: false, error: 'invalid_date_precision' })
  })

  it('validates responses and upload requests', () => {
    expect(validateResponsePayload({ text: 'A private response.' }).ok).toBe(true)
    expect(validateUploadRequest({ fileName: 'demo.jpg', mimeType: 'image/jpeg', size: 1200 }).ok).toBe(true)
    expect(
      validateUploadRequest({ fileName: 'demo.exe', mimeType: 'application/x-msdownload', size: 1200 }),
    ).toEqual({
      ok: false,
      error: 'unsupported_media_type',
    })
  })
})
