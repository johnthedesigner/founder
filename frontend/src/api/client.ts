export class ApiResponseError extends Error {
  status: number
  body: { error: string; issues?: unknown[] }

  constructor(status: number, body: { error: string; issues?: unknown[] }) {
    super(body.error)
    this.status = status
    this.body = body
  }
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const errorBody = (await res.json()) as { error: string; issues?: unknown[] }
    throw new ApiResponseError(res.status, errorBody)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
