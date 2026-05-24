import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { ApiRequest } from './http'
import { parseCookies } from './http'

export const editorSessionCookieName = 'memory_observatory_editor'
const sessionTtlSeconds = 60 * 60 * 24 * 14

interface EditorSessionPayload {
  sub: 'editor'
  iat: number
  exp: number
  nonce: string
}

const base64UrlEncode = (value: string) =>
  Buffer.from(value, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')

const base64UrlDecode = (value: string) => {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

const hmac = (value: string, secret: string) => createHmac('sha256', secret).update(value).digest('base64url')

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export const hashEditorSecret = (secret: string) =>
  createHash('sha256').update(secret.trim(), 'utf8').digest('hex')

export const verifyEditorSecret = (secret: string, expectedHash: string) => {
  const actual = hashEditorSecret(secret)
  return safeEqual(actual, expectedHash.trim().toLowerCase())
}

export const createEditorSessionToken = (secret: string, issuedAt = Date.now()) => {
  const issuedSeconds = Math.floor(issuedAt / 1000)
  const payload: EditorSessionPayload = {
    sub: 'editor',
    iat: issuedSeconds,
    exp: issuedSeconds + sessionTtlSeconds,
    nonce: randomUUID(),
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  return `${encodedPayload}.${hmac(encodedPayload, secret)}`
}

export const verifyEditorSessionToken = (token: string | undefined, secret: string, now = Date.now()) => {
  if (!token) return false
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return false
  if (!safeEqual(hmac(encodedPayload, secret), signature)) return false

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<EditorSessionPayload>
    return payload.sub === 'editor' && typeof payload.exp === 'number' && payload.exp > now / 1000
  } catch {
    return false
  }
}

export const verifyEditorRequest = (request: ApiRequest, sessionSecret: string) =>
  verifyEditorSessionToken(parseCookies(request).get(editorSessionCookieName), sessionSecret)

export const createEditorSessionCookie = (token: string) => {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
  return [
    `${editorSessionCookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${sessionTtlSeconds}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export const expireEditorSessionCookie = () =>
  `${editorSessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
