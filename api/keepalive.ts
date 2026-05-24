import { getOptionalSupabaseConfig } from './_lib/backendConfig'
import { createSupabaseAdmin } from './_lib/supabaseAdmin'

type HeaderValue = string | string[] | undefined

interface KeepaliveRequest {
  headers: {
    authorization?: HeaderValue
  }
}

interface KeepaliveResponse {
  status: (statusCode: number) => KeepaliveResponse
  json: (body: unknown) => void
}

const firstHeader = (value: HeaderValue) => (Array.isArray(value) ? value[0] : value)

export default async function handler(request: KeepaliveRequest, response: KeepaliveResponse) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = firstHeader(request.headers.authorization)

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    response.status(401).json({ ok: false })
    return
  }

  const supabaseConfig = getOptionalSupabaseConfig()
  const checkedAt = new Date().toISOString()

  if (!supabaseConfig) {
    response.status(500).json({ ok: false, reason: 'missing-supabase-env' })
    return
  }

  const supabase = createSupabaseAdmin(supabaseConfig)

  const { error: heartbeatError } = await supabase.from('memories').upsert({
    id: 'system-keepalive',
    title: 'System keepalive',
    description: 'Hidden technical heartbeat for the gift site.',
    author: 'Sistema',
    chapter: 'memory-room',
    category: 'daily',
    era: 'present',
    place: 'Supabase',
    importance: 1,
    media_url: '/media/placeholders/placeholder-memory.svg',
    media_type: 'image',
    mood: '#8f5cff',
    linked_memory_id: null,
    date: null,
    sort_order: -9999,
    hidden: true,
    updated_at: checkedAt,
  })

  if (!heartbeatError) {
    await supabase.from('editor_audit_events').insert({
      event_type: 'keepalive',
      subject_id: 'system-keepalive',
      metadata: { checkedAt },
    })
  }

  if (heartbeatError) {
    response.status(502).json({
      ok: false,
      step: 'heartbeat-upsert',
      reason: heartbeatError.message,
    })
    return
  }

  const checks = await Promise.all([
    supabase.from('memories').select('id').limit(1),
    supabase.from('responses').select('id').limit(1),
  ])
  const failed = checks.find((check) => check.error)

  if (failed) {
    response.status(502).json({
      ok: false,
      step: 'readback',
      reason: failed.error?.message,
    })
    return
  }

  response.status(200).json({
    ok: true,
    checkedAt,
    mode: 'write-and-read',
  })
}
