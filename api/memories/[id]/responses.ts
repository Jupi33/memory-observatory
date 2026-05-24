import { getBackendConfig } from '../../_lib/backendConfig'
import { verifyEditorRequest } from '../../_lib/editorSession'
import type { ApiRequest, ApiResponse } from '../../_lib/http'
import { getQueryString, methodNotAllowed, readJsonBody, sendJson } from '../../_lib/http'
import { validateResponsePayload } from '../../_lib/memoryPayload'
import { createSupabaseAdmin, writeAuditEvent } from '../../_lib/supabaseAdmin'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = request.method ?? 'GET'

  if (method !== 'POST') {
    methodNotAllowed(response, ['POST'])
    return
  }

  try {
    const config = getBackendConfig()
    if (!verifyEditorRequest(request, config.editorSessionSecret)) {
      sendJson(response, 401, { ok: false, error: 'editor_session_required' })
      return
    }

    const memoryId = String(getQueryString(request, 'id') ?? '').trim()
    if (!memoryId) {
      sendJson(response, 400, { ok: false, error: 'memory_id_required' })
      return
    }

    const validation = validateResponsePayload(readJsonBody(request))
    if (!validation.ok) {
      sendJson(response, 400, { ok: false, error: validation.error })
      return
    }

    const supabase = createSupabaseAdmin(config)
    const { data, error } = await supabase
      .from('responses')
      .insert({
        id: validation.value.id,
        memory_id: memoryId,
        author: validation.value.author,
        text: validation.value.text,
      })
      .select('*')
      .single()

    if (error) {
      sendJson(response, 502, { ok: false, error: 'supabase_response_failed', detail: error.message })
      return
    }

    await writeAuditEvent(config, 'response', memoryId, { responseId: validation.value.id })
    sendJson(response, 200, {
      ok: true,
      response: {
        id: String(data.id),
        memoryId: String(data.memory_id),
        author: String(data.author),
        text: String(data.text),
        createdAt: String(data.created_at),
      },
    })
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: 'backend_not_configured',
      detail: error instanceof Error ? error.message : 'Unknown backend error',
    })
  }
}
