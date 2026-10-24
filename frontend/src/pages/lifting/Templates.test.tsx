import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockApi, renderAt } from '../../test-utils'

const ME = { username: 'ethan', first_name: 'Ethan', last_name: 'Prosser' }
const PUSH = {
  id: 7,
  title: 'Push day',
  weekdays: [0, 2, 4],
  enabled: true,
  exercises: [
    { name: 'Bench press', sets: 4, mode: 'reps', rep_min: 6, rep_max: 10, seconds: null },
    { name: 'Plank', sets: 3, mode: 'seconds', rep_min: null, rep_max: null, seconds: 60 },
  ],
}

describe('Lifting templates', () => {
  it('lists templates with their schedule and targets', async () => {
    mockApi({ status: 200, body: ME }, { status: 200, body: [PUSH] })
    renderAt('/skills/lifting?tab=templates')
    const card = (await screen.findByRole('heading', { name: 'Push day' })).closest('li')!
    expect(within(card).getByText('Mon · Wed · Fri')).toBeInTheDocument()
    expect(within(card).getByText('4 × 6–10 reps')).toBeInTheDocument()
    expect(within(card).getByText('3 × 60 s hold')).toBeInTheDocument()
    expect(within(card).getByRole('switch', { name: 'Push day enabled' })).toBeChecked()
  })

  it('creates a template with a rep exercise and a timed hold', async () => {
    const created = { ...PUSH, id: 8, title: 'Core', weekdays: [1, 3] }
    const fetchMock = mockApi(
      { status: 200, body: ME },
      { status: 200, body: [] },
      { status: 201, body: created },
    )
    renderAt('/skills/lifting?tab=templates')
    const user = userEvent.setup()
    expect(await screen.findByText(/No templates yet/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+ New template' }))

    await user.type(screen.getByLabelText('Title'), 'Core')
    await user.click(screen.getByLabelText('Tue'))
    await user.click(screen.getByLabelText('Thu'))
    await user.type(screen.getByLabelText('Exercise 1 name'), 'Crunch')
    await user.click(screen.getByRole('button', { name: '+ Add exercise' }))
    await user.type(screen.getByLabelText('Exercise 2 name'), 'Plank')
    await user.selectOptions(screen.getAllByLabelText('Type')[1], 'seconds')
    await user.clear(screen.getByLabelText('Seconds'))
    await user.type(screen.getByLabelText('Seconds'), '45')
    await user.click(screen.getByRole('button', { name: 'Save template' }))

    expect(await screen.findByRole('heading', { name: 'Core' })).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[2]
    expect(url).toBe('/api/lifting/templates')
    expect(JSON.parse(init.body)).toEqual({
      title: 'Core',
      weekdays: [1, 3],
      enabled: true,
      exercises: [
        { name: 'Crunch', sets: 3, mode: 'reps', rep_min: 8, rep_max: 12 },
        { name: 'Plank', sets: 3, mode: 'seconds', seconds: 45 },
      ],
    })
  })

  it('needs at least one training day', async () => {
    const fetchMock = mockApi({ status: 200, body: ME }, { status: 200, body: [] })
    renderAt('/skills/lifting?tab=templates')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '+ New template' }))
    await user.type(screen.getByLabelText('Title'), 'Legs')
    await user.type(screen.getByLabelText('Exercise 1 name'), 'Squat')
    await user.click(screen.getByRole('button', { name: 'Save template' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one training day.')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('switches a template off', async () => {
    const fetchMock = mockApi(
      { status: 200, body: ME },
      { status: 200, body: [PUSH] },
      { status: 200, body: { ...PUSH, enabled: false } },
    )
    renderAt('/skills/lifting?tab=templates')
    const toggle = await screen.findByRole('switch', { name: 'Push day enabled' })
    await userEvent.click(toggle)
    expect(await screen.findByText('Off')).toBeInTheDocument()
    expect(fetchMock.mock.calls[2][1].method).toBe('PATCH')
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ enabled: false })
  })

  it('edits a template in place', async () => {
    const fetchMock = mockApi(
      { status: 200, body: ME },
      { status: 200, body: [PUSH] },
      { status: 200, body: { ...PUSH, title: 'Push A' } },
    )
    renderAt('/skills/lifting?tab=templates')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Title')).toHaveValue('Push day')
    expect(screen.getByLabelText('Exercise 2 name')).toHaveValue('Plank')
    expect(screen.getByLabelText('Seconds')).toHaveValue(60)
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Push A')
    await user.click(screen.getByRole('button', { name: 'Save template' }))

    expect(await screen.findByRole('heading', { name: 'Push A' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[2][0]).toBe('/api/lifting/templates/7')
    expect(fetchMock.mock.calls[2][1].method).toBe('PUT')
  })
})
