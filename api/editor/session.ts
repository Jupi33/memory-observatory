import { getBackendConfig } from '../_lib/backendConfig'
import {
  createEditorSessionCookie,
  createEditorSessionToken,
  expireEditorSessionCookie,
  verifyEditorRequest,
  verifyEditorSecret,
} from '../_lib/editorSession'
import type { ApiRequest, ApiResponse } from '../_lib/http'
import { methodNotAllowed, readJsonBody, sendJson } from '../_lib/http'
import { writeAuditEvent } from '../_lib/supabaseAdmin'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = request.method ?? 'GET'

  try {
    const config = getBackendConfig()

    if (method === 'GET') {
      sendJson(response, 200, {
        ok: true,
        authenticated: verifyEditorRequest(request, config.editorSessionSecret),
      })
      return
    }

    if (method === 'POST') {
      const body = readJsonBody(request)
      const secret = String(body.secret ?? body.passphrase ?? body.key ?? '')

      if (!verifyEditorSecret(secret, config.editorSecretHash)) {
        sendJson(response, 401, { ok: false, error: 'invalid_editor_key' })
        return
      }

      const token = createEditorSessionToken(config.editorSessionSecret)
      response.setHeader('set-cookie', createEditorSessionCookie(token))
      await writeAuditEvent(config, 'session_login', null, { source: 'editor-session' })
      sendJson(response, 200, { ok: true, authenticated: true })
      return
    }

    if (method === 'DELETE') {
      response.setHeader('set-cookie', expireEditorSessionCookie())
      sendJson(response, 200, { ok: true, authenticated: false })
      return
    }

    methodNotAllowed(response, ['GET', 'POST', 'DELETE'])
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: 'backend_not_configured',
      detail: error instanceof Error ? error.message : 'Unknown backend error',
    })
  }
}
