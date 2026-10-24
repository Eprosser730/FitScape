import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { todayIso } from '../../dates'
import { mockApi, renderAt } from '../../test-utils'

const ME = { username: 'ethan', first_name: 'Ethan', last_name: 'Prosser' }
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]
const PUSH = {
  id: 7,
  title: 'Push day',
  weekdays: EVERY_DAY, // always "today", so it is preselected
  enabled: true,
  exercises: [
    { name: 'Bench press', sets: 2, mode: 'reps', rep_min: 6, rep_max: 10, seconds: null },
    { name: 'Plank', sets: 1, mode: 'seconds', rep_min: null, rep_max: null, seconds: 60 },
  ],
}
const LEGS = {
  id: 8,
  title: 'Leg day',
  weekdays: [],
  enabled: true,
  exercises: [{ name: 'Squat', sets: 3, mode: 'reps', rep_min: 5, rep_max: 5, seconds: null }],
}
const OFF = { ...LEGS, id: 9, title: 'Old plan', enabled: false }
const SAVED = {
  id: 50,
  template_id: 7,
  title: 'Push day',
  performed_on: '2026-10-22',
  notes: 'Felt strong.',
  exercises: [
    {
      name: 'Bench press', mode: 'reps', rep_min: 6, rep_max: 10, target_seconds: null,
      sets: [{ reps: 10, seconds: null, weight_lb: '135.0' }, { reps: 8, seconds: null, weight_lb: '145.0' }],
    },
    {
      name: 'Plank', mode: 'seconds', rep_min: null, rep_max: null, target_seconds: 60,
      sets: [{ reps: null, seconds: 62, weight_lb: null }],
    },
  ],
}

describe('Log workout', () => {
  it("preselects today's template, tracks totals live, and saves to the archive", async () => {
    const fetchMock = mockApi(
      { status: 200, body: ME },
      { status: 200, body: [PUSH, LEGS, OFF] },
      { status: 201, body: SAVED },
      { status: 200, body: [SAVED] },
    )
    renderAt('/skills/lifting')
    const user = userEvent.setup()

    const select = await screen.findByLabelText('Template')
    expect(select).toHaveValue('7')
    expect(within(select).queryByText('Old plan')).not.toBeInTheDocument() // disabled templates hidden
    expect(screen.getByRole('heading', { name: 'Bench press' })).toBeInTheDocument()
    expect(screen.getByText('2 × 6–10 reps')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Bench press set 1 reps'), '10')
    await user.type(screen.getByLabelText('Bench press set 1 weight in pounds'), '135')
    await user.type(screen.getByLabelText('Bench press set 2 reps'), '8')
    await user.type(screen.getByLabelText('Bench press set 2 weight in pounds'), '145')
    await user.type(screen.getByLabelText('Plank set 1 seconds'), '62')
    expect(screen.getByText('2,510 lb')).toBeInTheDocument() // 10x135 + 8x145
    await user.type(screen.getByLabelText('Notes (optional)'), 'Felt strong.')
    await user.click(screen.getByRole('button', { name: 'Save workout' }))

    expect(await screen.findByText(/Saved Push day/)).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      template_id: 7,
      title: 'Push day',
      performed_on: todayIso(),
      notes: 'Felt strong.',
      exercises: [
        {
          name: 'Bench press', mode: 'reps', rep_min: 6, rep_max: 10, target_seconds: null,
          sets: [
            { reps: 10, seconds: null, weight_lb: 135 },
            { reps: 8, seconds: null, weight_lb: 145 },
          ],
        },
        {
          name: 'Plank', mode: 'seconds', rep_min: null, rep_max: null, target_seconds: 60,
          sets: [{ reps: null, seconds: 62, weight_lb: null }],
        },
      ],
    })
  })

  it('rebuilds the form when another template is picked, and sets can be added', async () => {
    mockApi({ status: 200, body: ME }, { status: 200, body: [PUSH, LEGS] })
    renderAt('/skills/lifting')
    const user = userEvent.setup()
    await user.selectOptions(await screen.findByLabelText('Template'), '8')
    expect(screen.getByRole('heading', { name: 'Squat' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Bench press' })).not.toBeInTheDocument()
    expect(screen.getAllByLabelText(/Squat set \d reps/)).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: '+ Set' }))
    expect(screen.getAllByLabelText(/Squat set \d reps/)).toHaveLength(4)
  })

  it('points to the templates tab when nothing is enabled', async () => {
    mockApi({ status: 200, body: ME }, { status: 200, body: [OFF] }, { status: 200, body: [OFF] })
    renderAt('/skills/lifting')
    await userEvent.click(await screen.findByRole('button', { name: 'Create a template' }))
    expect(await screen.findByRole('heading', { name: 'Old plan' })).toBeInTheDocument()
  })
})

describe('Workout archive', () => {
  it('shows date, title and volume, and expands into every set', async () => {
    mockApi({ status: 200, body: ME }, { status: 200, body: [SAVED] })
    renderAt('/skills/lifting?tab=archive')
    const user = userEvent.setup()
    expect(await screen.findByText('Push day')).toBeInTheDocument()
    expect(screen.getByText(/2 exercises · 3 sets · 2,510 lb/)).toBeInTheDocument()
    await user.click(screen.getByText('Push day'))
    expect(screen.getByText('10 × 135 lb')).toBeInTheDocument()
    expect(screen.getByText('8 × 145 lb')).toBeInTheDocument()
    expect(screen.getByText('62 s')).toBeInTheDocument()
    expect(screen.getByText('Felt strong.')).toBeInTheDocument()
  })

  it('deletes a workout after confirming', async () => {
    const fetchMock = mockApi({ status: 200, body: ME }, { status: 200, body: [SAVED] }, { status: 204 })
    renderAt('/skills/lifting?tab=archive')
    const user = userEvent.setup()
    await user.click(await screen.findByText('Push day'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete for good' }))
    expect(await screen.findByText(/No workouts yet/)).toBeInTheDocument()
    expect(fetchMock.mock.calls[2][0]).toBe('/api/lifting/workouts/50')
  })
})
