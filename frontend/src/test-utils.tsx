import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import Dashboard from './pages/Dashboard'
import SignIn from './pages/SignIn'

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

export function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/signin" element={<SignIn />} />
      </Routes>
    </MemoryRouter>,
  )
}
