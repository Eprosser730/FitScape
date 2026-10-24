import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockApi, renderAt } from '../test-utils'
import { SKILLS } from '../skills'

const ME = { username: 'ethan', first_name: 'Ethan', last_name: 'Prosser' }

describe('Dashboard', () => {
  it('greets the user and lists every skill', async () => {
    mockApi({ status: 200, body: ME })
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Welcome, Ethan' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(SKILLS.length)
    expect(
      screen.getByRole('heading', { name: `Total level: ${SKILLS.length}` }),
    ).toBeInTheDocument()
  })

  it('sends signed-out visitors to sign-in', async () => {
    mockApi({ status: 401 })
    renderAt('/')
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('logs out and returns to sign-in', async () => {
    const fetchMock = mockApi({ status: 200, body: ME }, { status: 204 })
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/logout')
    expect(fetchMock.mock.calls[1][1].method).toBe('POST')
  })
})
