// Tiny fetch wrapper for our JSON API. Never throws for HTTP errors: callers switch on `status`.
export type ApiResult<T> = { status: number; data: T }

export type User = { username: string; first_name: string; last_name: string }

export async function api<T = unknown>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, data: data as T }
}
