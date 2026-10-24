import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockApi, renderAt } from '../test-utils'

const ME = { username: 'ethan', first_name: 'Ethan', last_name: 'Prosser' }

async function signIn(username = 'ethan', pin = '4826') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Username'), username)
  await user.type(screen.getByLabelText('PIN'), pin)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

async function fillSignUp(user: ReturnType<typeof userEvent.setup>, confirmPin = '4826') {
  await user.type(await screen.findByLabelText('First name'), 'New')
  await user.type(screen.getByLabelText('Last name'), 'Person')
  await user.type(screen.getByLabelText('Choose a 4-digit PIN'), '4826')
  await user.type(screen.getByLabelText('Confirm PIN'), confirmPin)
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('SignIn', () => {
  it('signs in and lands on the dashboard', async () => {
    const fetchMock = mockApi({ status: 200, body: ME }, { status: 200, body: ME })
    renderAt('/signin')
    await signIn()
    expect(await screen.findByRole('heading', { name: 'Welcome, Ethan' })).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: 'ethan', pin: '4826' })
  })

  it('shows attempts left after a wrong PIN', async () => {
    mockApi({ status: 401, body: { code: 'wrong_pin', attempts_left: 1 } })
    renderAt('/signin')
    await signIn()
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong PIN. 1 attempt left.')
  })

  it('explains a lockout', async () => {
    mockApi({ status: 423, body: { code: 'locked', locked_until: '2026-10-24T15:30:00Z' } })
    renderAt('/signin')
    await signIn()
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many wrong PINs')
  })

  it('switches to sign-up for an unknown username and creates the account', async () => {
    const fetchMock = mockApi(
      { status: 404, body: { code: 'user_not_found' } },
      { status: 201, body: ME },
      { status: 200, body: ME },
    )
    renderAt('/signin')
    const user = await signIn('newbie')

    expect(await screen.findByRole('status')).toHaveTextContent('No account named newbie')
    expect(screen.getByLabelText('Username')).toHaveValue('newbie')
    await fillSignUp(user)

    expect(await screen.findByRole('heading', { name: 'Welcome, Ethan' })).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      username: 'newbie',
      first_name: 'New',
      last_name: 'Person',
      pin: '4826',
    })
  })

  it('does not call the API when the PINs differ', async () => {
    const fetchMock = mockApi({ status: 404, body: { code: 'user_not_found' } })
    renderAt('/signin')
    await fillSignUp(await signIn('newbie'), '4827')
    expect(screen.getByRole('alert')).toHaveTextContent("PINs don't match.")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports a taken username', async () => {
    mockApi(
      { status: 404, body: { code: 'user_not_found' } },
      { status: 409, body: { code: 'username_taken' } },
    )
    renderAt('/signin')
    await fillSignUp(await signIn('newbie'))
    expect(await screen.findByRole('alert')).toHaveTextContent('That username was just taken')
  })

  it('shows a friendly message when the server is unreachable', async () => {
    mockApi() // nothing queued: fetch resolves undefined, so the wrapper throws like a network error
    renderAt('/signin')
    await signIn()
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach FitScape")
  })
})
