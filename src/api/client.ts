// src/api/client.ts
import { showGlobalToast } from '../components/ToastProvider'

const BASE_URL =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL
  ?? 'http://localhost:8091/api/v1'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    showGlobalToast(msg)
    throw err
  }

  if (!res.ok) {
    let msg = res.statusText
    try {
      const body = await res.json() as { error?: string }
      if (body.error) msg = body.error
    } catch { /* ignore */ }
    const error = new ApiError(res.status, msg)
    showGlobalToast(msg)
    throw error
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
