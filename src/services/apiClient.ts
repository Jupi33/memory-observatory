const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '')

export const hasApiBackend = Boolean(configuredApiBase)

export class ApiClientError extends Error {
  status: number
  payload?: unknown

  constructor(message: string, status: number, payload?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.payload = payload
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!configuredApiBase) {
    throw new ApiClientError('API backend is not configured.', 0)
  }

  const response = await fetch(`${configuredApiBase}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...init.headers,
    },
  })

  const payload = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    throw new ApiClientError(`API request failed with ${response.status}`, response.status, payload)
  }

  return payload as T
}
