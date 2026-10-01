import { getCurrentLanguage } from '@/i18n'
import { getToken } from './token'

const API_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api`

// `status` is the HTTP status, or 0 when the request never reached the API.
// `code` is the API's language-independent error identifier (e.g.
// EMAIL_TAKEN); the UI picks its own translated text from it.
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(status: number, code: string | null, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
}

export async function apiFetch<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Accept-Language': getCurrentLanguage(),
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, null, 'Network error')
  }

  if (!response.ok) {
    throw await toApiError(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

// API errors look like { statusCode, code, message: string | string[] }.
async function toApiError(response: Response): Promise<ApiError> {
  try {
    const data: unknown = await response.json()
    if (typeof data === 'object' && data !== null) {
      const { code, message } = data as { code?: unknown; message?: unknown }
      return new ApiError(
        response.status,
        typeof code === 'string' ? code : null,
        Array.isArray(message) ? message.join(', ') : String(message),
      )
    }
  } catch {
    // Not a JSON body; fall through to the status text.
  }
  return new ApiError(response.status, null, response.statusText)
}
