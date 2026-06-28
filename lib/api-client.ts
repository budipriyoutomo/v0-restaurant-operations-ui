// Thin fetch wrapper for the Issue Core REST API.
// All methods throw on non-2xx so callers can catch errors.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Token management — stored in localStorage under 'auth_token'
export const authToken = {
  get: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  set: (token: string): void =>
    typeof window !== 'undefined' ? localStorage.setItem('auth_token', token) : undefined,
  clear: (): void =>
    typeof window !== 'undefined' ? localStorage.removeItem('auth_token') : undefined,
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = authToken.get()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return { ...headers, ...(extra ?? {}) }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: buildHeaders(options?.headers),
    ...options,
  })
  if (!res.ok) {
    // Clear token on 401 so stale tokens don't get stuck
    if (res.status === 401) authToken.clear()
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status} ${path}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T = void>(path: string)         => request<T>(path, { method: 'DELETE' }),
}
