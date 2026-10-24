import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { todayIso } from '../dates'
import { weekStart, type Run } from '../running'
import { mockApi, renderAt } from '../test-utils'

const ME = { username: 'ethan', first_name: 'Ethan', last_name: 'Prosser' }
const THIS_MONDAY = weekStart(todayIso())
const LAST_MONDAY = weekStart(todayIso(), 1)
const LONG: Run = { id: 1, ran_on: LAST_MONDAY, distance_mi: '6.20', notes: 'Long run.', segments: [] }
const SHORT: Run = {
  id: 2,
  ran_on: THIS_MONDAY,
  distance_mi: '2.00',
  notes: null,
  segments: [
    { kind: 'run', seconds: 120 },
    { kind: 'walk', seconds: 120 },
  ],
}

const rowTexts = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[1].textContent)

describe('Running', () => {
  it("shows this week's and last week's mileage", async () => {
    mockApi({ status: 200, body: ME }, { status: 200, body: [SHORT, LONG] })
    renderAt('/skills/running')
    const mileage = await screen.findByRole('region', { name: 'Weekly mileage' })
    expect(within(mileage).getByText('2.00 mi')).toBeInTheDocument()
    expect(within(mileage).getByText('6.20 mi')).toBeInTheDocument()
    expect(within(mileage).getByText(/4.20 mi vs last week/)).toBeInTheDocument()
  })

  it('logs a run with run/walk intervals and notes, then lands on the archive', async () => {
    const saved: Run = {
      id: 9,
      ran_on: todayIso(),
      distance_mi: '1.50',
      notes: 'Felt good.',
      segments: [
        { kind: 'run', seconds: 120 },
        { kind: 'walk', seconds: 90 },
      ],
    }
    const fetchMock = mockApi({ status: 200, body: ME }, { status: 200, body: [] }, { status: 201, body: saved })
    renderAt('/skills/running')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Total distance (mi)'), '1.5')
    await user.click(screen.getByRole('button', { name: '+ Interval' }))
    await user.type(screen.getByLabelText('Interval 1 minutes'), '2')
    await user.click(screen.getByRole('button', { name: '+ Interval' }))
    expect(screen.getByLabelText('Interval 2 type')).toHaveValue('walk') // alternates automatically
    await user.clear(screen.getByLabelText('Interval 2 minutes'))
    await user.type(screen.getByLabelText('Interval 2 minutes'), '1')
    await user.type(screen.getByLabelText('Interval 2 seconds'), '30')
    expect(screen.getByText('3:30 total')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Notes (optional)'), 'Felt good.')
    await user.click(screen.getByRole('button', { name: 'Save run' }))

    expect(await screen.findByText('Run saved. Nice work.')).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      ran_on: todayIso(),
      distance_mi: 1.5,
      notes: 'Felt good.',
      segments: [
        { kind: 'run', seconds: 120 },
        { kind: 'walk', seconds: 90 },
      ],
    })
    expect(screen.getByRole('cell', { name: '1.50 mi' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Weekly mileage' })).getByText('1.50 mi')).toBeInTheDocument()
  })

  it('refuses an interval with no time', async () => {
    const fetchMock = mockApi({ status: 200, body: ME }, { status: 200, body: [] })
    renderAt('/skills/running')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Total distance (mi)'), '2')
    await user.click(screen.getByRole('button', { name: '+ Interval' }))
    await user.click(screen.getByRole('button', { name: 'Save run' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Give every interval a time')
    expect(fetchMock).toHaveBeenCalledTimes(2) // nothing posted
  })

  it('archive sorts by date or distance', async () => {
    const MID: Run = { ...LONG, id: 3, ran_on: '2026-01-05', distance_mi: '3.10' }
    mockApi({ status: 200, body: ME }, { status: 200, body: [SHORT, LONG, MID] })
    renderAt('/skills/running?tab=archive')
    const user = userEvent.setup()
    await screen.findByRole('table')
    expect(rowTexts()).toEqual(['2.00 mi', '6.20 mi', '3.10 mi']) // newest first
    await user.click(screen.getByRole('button', { name: /Distance/ }))
    expect(rowTexts()).toEqual(['6.20 mi', '3.10 mi', '2.00 mi'])
    await user.click(screen.getByRole('button', { name: /Distance/ }))
    expect(rowTexts()).toEqual(['2.00 mi', '3.10 mi', '6.20 mi'])
    await user.click(screen.getByRole('button', { name: /Date/ }))
    expect(rowTexts()).toEqual(['2.00 mi', '6.20 mi', '3.10 mi'])
    expect(screen.getByText('Run 2:00 · Walk 2:00')).toBeInTheDocument()
  })

  it('deletes a run after confirming', async () => {
    const fetchMock = mockApi({ status: 200, body: ME }, { status: 200, body: [LONG] }, { status: 204 })
    renderAt('/skills/running?tab=archive')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete for good' }))
    expect(await screen.findByText(/No runs yet/)).toBeInTheDocument()
    expect(fetchMock.mock.calls[2][0]).toBe('/api/running/runs/1')
  })
})
