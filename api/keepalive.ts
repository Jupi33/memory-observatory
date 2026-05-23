type HeaderValue = string | string[] | undefined

declare const process: {
  env: Record<string, string | undefined>
}

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

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  const checkedAt = new Date().toISOString()

  if (!supabaseUrl || !supabaseKey) {
    response.status(500).json({ ok: false, reason: 'missing-supabase-env' })
    return
  }

  const supabaseHeaders = {
    apikey: supabaseKey,
    authorization: `Bearer ${supabaseKey}`,
  }

  const heartbeatUrl = new URL('/rest/v1/memories', supabaseUrl)
  heartbeatUrl.searchParams.set('on_conflict', 'id')

  const heartbeat = await fetch(heartbeatUrl, {
    method: 'POST',
    headers: {
      ...supabaseHeaders,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
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
    }),
  })

  if (!heartbeat.ok) {
    response.status(502).json({
      ok: false,
      status: heartbeat.status,
      step: 'heartbeat-upsert',
      reason: await heartbeat.text(),
    })
    return
  }

  const memoriesUrl = new URL('/rest/v1/memories', supabaseUrl)
  memoriesUrl.searchParams.set('select', 'id')
  memoriesUrl.searchParams.set('limit', '1')

  const responsesUrl = new URL('/rest/v1/responses', supabaseUrl)
  responsesUrl.searchParams.set('select', 'id')
  responsesUrl.searchParams.set('limit', '1')

  const checks = await Promise.all([
    fetch(memoriesUrl, { headers: supabaseHeaders }),
    fetch(responsesUrl, { headers: supabaseHeaders }),
  ])
  const failed = checks.find((check) => !check.ok)

  if (failed) {
    response.status(502).json({
      ok: false,
      status: failed.status,
      step: 'readback',
      reason: await failed.text(),
    })
    return
  }

  response.status(200).json({
    ok: true,
    checkedAt,
    mode: 'write-and-read',
  })
}
