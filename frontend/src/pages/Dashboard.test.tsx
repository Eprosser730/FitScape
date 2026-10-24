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
    expect(screen.getByText('Total level').parentElement).toHaveTextContent(`Total level${SKILLS.length}`)
    for (const skill of SKILLS) {
      expect(screen.getByRole('heading', { name: skill.name })).toBeInTheDocument()
      expect(screen.getByText(`${skill.osrs} · Level 1`)).toBeInTheDocument()
    }
  })

  it('sends signed-out visitors to sign-in', async () => {
    mockApi({ status: 401 })
    renderAt('/')
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows an error instead of signing out when /api/me fails', async () => {
    mockApi({ status: 500 })
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  })

  it('stays on the dashboard and says so when logout fails', async () => {
    mockApi({ status: 200, body: ME }, { status: 500 })
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't log out")
    expect(screen.getByRole('heading', { name: 'Welcome, Ethan' })).toBeInTheDocument()
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
