import { apiRequest, hasApiBackend } from './apiClient'

interface EditorSessionResponse {
  ok: boolean
  authenticated: boolean
}

export const editorSessionRepository = {
  hasBackend: hasApiBackend,

  async status() {
    if (!hasApiBackend) return { authenticated: true, demo: true }
    const result = await apiRequest<EditorSessionResponse>('/editor/session')
    return { authenticated: result.authenticated, demo: false }
  },

  async login(secret: string) {
    const result = await apiRequest<EditorSessionResponse>('/editor/session', {
      method: 'POST',
      body: JSON.stringify({ secret }),
    })
    return result.authenticated
  },

  async logout() {
    if (!hasApiBackend) return
    await apiRequest<EditorSessionResponse>('/editor/session', { method: 'DELETE' })
  },
}
