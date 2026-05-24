import { getBackendConfig } from '../_lib/backendConfig'
import { verifyEditorRequest } from '../_lib/editorSession'
import type { ApiRequest, ApiResponse } from '../_lib/http'
import { getQueryString, methodNotAllowed, readJsonBody, sendJson } from '../_lib/http'
import { memoryFromRow, memoryToRow, validateMemoryPayload } from '../_lib/memoryPayload'
import { createSupabaseAdmin, listVisibleMemories, writeAuditEvent } from '../_lib/supabaseAdmin'

const requireEditor = (request: ApiRequest, sessionSecret: string) =>
  verifyEditorRequest(request, sessionSecret)

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = request.method ?? 'GET'

  try {
    const config = getBackendConfig()
    const supabase = createSupabaseAdmin(config)

    if (method === 'GET') {
      const { data, error } = await listVisibleMemories(config)
      if (error) {
        sendJson(response, 502, { ok: false, error: 'supabase_read_failed', detail: error.message })
        return
      }
      sendJson(response, 200, { ok: true, memories: (data ?? []).map(memoryFromRow) })
      return
    }

    if (!requireEditor(request, config.editorSessionSecret)) {
      sendJson(response, 401, { ok: false, error: 'editor_session_required' })
      return
    }

    if (method === 'POST' || method === 'PATCH') {
      const validation = validateMemoryPayload(readJsonBody(request))
      if (!validation.ok) {
        sendJson(response, 400, { ok: false, error: validation.error })
        return
      }

      const { data, error } = await supabase
        .from('memories')
        .upsert(memoryToRow(validation.value))
        .select('*, responses(*)')
        .single()

      if (error) {
        sendJson(response, 502, { ok: false, error: 'supabase_write_failed', detail: error.message })
        return
      }

      await writeAuditEvent(config, method === 'POST' ? 'create' : 'update', validation.value.id, {
        title: validation.value.title,
      })
      sendJson(response, 200, { ok: true, memory: memoryFromRow(data) })
      return
    }

    if (method === 'DELETE') {
      const body = readJsonBody(request)
      const memoryId = String(body.id ?? getQueryString(request, 'id') ?? '').trim()
      if (!memoryId) {
        sendJson(response, 400, { ok: false, error: 'memory_id_required' })
        return
      }

      const { error } = await supabase.from('memories').delete().eq('id', memoryId)
      if (error) {
        sendJson(response, 502, { ok: false, error: 'supabase_delete_failed', detail: error.message })
        return
      }

      await writeAuditEvent(config, 'delete', memoryId)
      sendJson(response, 200, { ok: true })
      return
    }

    methodNotAllowed(response, ['GET', 'POST', 'PATCH', 'DELETE'])
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: 'backend_not_configured',
      detail: error instanceof Error ? error.message : 'Unknown backend error',
    })
  }
}
