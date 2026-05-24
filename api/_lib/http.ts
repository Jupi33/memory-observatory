export type HeaderValue = string | string[] | undefined

export interface ApiRequest {
  method?: string
  headers: Record<string, HeaderValue>
  body?: unknown
  query?: Record<string, string | string[] | undefined>
}

export interface ApiResponse {
  status: (statusCode: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string | string[]) => void
}

export const firstHeader = (value: HeaderValue) => (Array.isArray(value) ? value[0] : value)

export const sendJson = (response: ApiResponse, statusCode: number, body: unknown) => {
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.status(statusCode).json(body)
}

export const methodNotAllowed = (response: ApiResponse, allowed: string[]) => {
  response.setHeader('allow', allowed.join(', '))
  sendJson(response, 405, { ok: false, error: 'method_not_allowed' })
}

export const readJsonBody = (request: ApiRequest): Record<string, unknown> => {
  if (!request.body) return {}
  if (typeof request.body === 'string') {
    try {
      const parsed = JSON.parse(request.body) as unknown
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  return typeof request.body === 'object' && !Array.isArray(request.body)
    ? (request.body as Record<string, unknown>)
    : {}
}

export const getQueryString = (request: ApiRequest, key: string) => {
  const value = request.query?.[key]
  return Array.isArray(value) ? value[0] : value
}

export const parseCookies = (request: ApiRequest) => {
  const cookieHeader = firstHeader(request.headers.cookie)
  const cookies = new Map<string, string>()
  if (!cookieHeader) return cookies

  cookieHeader.split(';').forEach((part) => {
    const index = part.indexOf('=')
    if (index === -1) return
    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (name) cookies.set(name, decodeURIComponent(value))
  })

  return cookies
}
