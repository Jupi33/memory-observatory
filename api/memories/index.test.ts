import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from './index'
import type { ApiRequest, ApiResponse } from '../_lib/http'

vi.mock('../_lib/supabaseAdmin', () => ({
  createSupabaseAdmin: () => ({
    from: () => ({
      upsert: vi.fn(),
      delete: vi.fn(),
    }),
  }),
  listVisibleMemories: vi.fn(async () => ({
    data: [
      {
        id: 'visible-memory',
        title: 'Visible memory',
        description: '',
        author: 'Demo',
        chapter: 'memory-room',
        category: 'daily',
        era: 'present',
        place: 'Demo',
        importance: 1,
        media_url: '/media/placeholders/placeholder-memory.svg',
        media_type: 'image',
        mood: '#8f5cff',
        linked_memory_id: null,
        date: '2026',
        sort_order: 1,
        hidden: false,
        responses: [],
      },
    ],
    error: null,
  })),
  writeAuditEvent: vi.fn(async () => undefined),
}))

const makeResponse = () => {
  const body: { statusCode?: number; json?: unknown; headers: Record<string, string | string[]> } = {
    headers: {},
  }
  const response: ApiResponse = {
    setHeader: (name, value) => {
      body.headers[name.toLowerCase()] = value
    },
    status: (statusCode) => {
      body.statusCode = statusCode
      return response
    },
    json: (payload) => {
      body.json = payload
    },
  }
  return { body, response }
}

describe('/api/memories', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.EDITOR_SECRET_HASH = '0'.repeat(64)
    process.env.EDITOR_SESSION_SECRET = 'session-secret'
  })

  it('allows public reads of visible memories', async () => {
    const { body, response } = makeResponse()
    await handler({ method: 'GET', headers: {} } as ApiRequest, response)

    expect(body.statusCode).toBe(200)
    expect(body.json).toMatchObject({ ok: true, memories: [{ id: 'visible-memory' }] })
  })

  it('rejects writes without an editor cookie before touching Supabase', async () => {
    const { body, response } = makeResponse()
    await handler(
      {
        method: 'POST',
        headers: {},
        body: { title: 'No session', mediaUrl: '/media/placeholders/placeholder-memory.svg' },
      } as ApiRequest,
      response,
    )

    expect(body.statusCode).toBe(401)
    expect(body.json).toEqual({ ok: false, error: 'editor_session_required' })
  })
})
