import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { AppRoutes } from './App'

type Reply = { status: number; body?: unknown }

/** Fakes the API: each call to fetch gets the next reply, in order. Returns the mock to inspect calls. */
export function mockApi(...replies: Reply[]) {
  const fetchMock = vi.fn()
  for (const { status, body } of replies) {
    fetchMock.mockResolvedValueOnce(
      new Response(body === undefined ? null : JSON.stringify(body), { status }),
    )
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Renders the real app routes at `path`, so tests exercise the same layout and guards. */
export function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}
