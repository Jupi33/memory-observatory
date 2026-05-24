import { describe, expect, it } from 'vitest'
import {
  createEditorSessionToken,
  hashEditorSecret,
  verifyEditorSecret,
  verifyEditorSessionToken,
} from './editorSession'

describe('editor session security helpers', () => {
  it('hashes and verifies the private editor key without storing plain text', () => {
    const hash = hashEditorSecret('quiet-violet-key')

    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(verifyEditorSecret('quiet-violet-key', hash)).toBe(true)
    expect(verifyEditorSecret('wrong-key', hash)).toBe(false)
  })

  it('signs expiring editor sessions with a server-only secret', () => {
    const now = Date.parse('2026-05-24T12:00:00.000Z')
    const token = createEditorSessionToken('session-secret', now)

    expect(verifyEditorSessionToken(token, 'session-secret', now + 1000)).toBe(true)
    expect(verifyEditorSessionToken(token, 'other-secret', now + 1000)).toBe(false)
    expect(verifyEditorSessionToken(token, 'session-secret', now + 15 * 24 * 60 * 60 * 1000)).toBe(false)
  })
})
