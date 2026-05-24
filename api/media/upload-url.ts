import { randomUUID } from 'node:crypto'
import { getBackendConfig } from '../_lib/backendConfig'
import { verifyEditorRequest } from '../_lib/editorSession'
import type { ApiRequest, ApiResponse } from '../_lib/http'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http'
import { extensionForUpload, validateUploadRequest } from '../_lib/memoryPayload'
import { createSupabaseAdmin, writeAuditEvent } from '../_lib/supabaseAdmin'

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

    const validation = validateUploadRequest(readJsonBody(request))
    if (!validation.ok) {
      sendJson(response, 400, { ok: false, error: validation.error })
      return
    }

    const supabase = createSupabaseAdmin(config)
    const extension = extensionForUpload(validation.value.fileName, validation.value.mimeType)
    const today = new Date().toISOString().slice(0, 10)
    const path = `uploads/${today}/${randomUUID()}.${extension}`
    const { data, error } = await supabase.storage.from(config.mediaBucket).createSignedUploadUrl(path)

    if (error || !data) {
      sendJson(response, 502, {
        ok: false,
        error: 'signed_upload_failed',
        detail: error?.message ?? 'No signed URL returned',
      })
      return
    }

    const { data: publicData } = supabase.storage.from(config.mediaBucket).getPublicUrl(path)
    await writeAuditEvent(config, 'upload', path, {
      mimeType: validation.value.mimeType,
      size: validation.value.size,
    })

    sendJson(response, 200, {
      ok: true,
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: publicData.publicUrl,
      method: 'PUT',
    })
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: 'backend_not_configured',
      detail: error instanceof Error ? error.message : 'Unknown backend error',
    })
  }
}
