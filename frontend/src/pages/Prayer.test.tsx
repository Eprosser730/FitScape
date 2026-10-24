import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { todayIso } from '../dates'
import { mockApi, renderAt } from '../test-utils'

const ME = { username: 'ethan', first_name: 'Ethan', last_name: 'Prosser' }
const NOTES = [
  { id: 2, read_on: '2026-10-21', passage: 'John 3:1-21', summary: 'Nicodemus visits Jesus at night.' },
  { id: 1, read_on: '2026-10-20', passage: 'Psalm 23', summary: 'The Lord is my shepherd.' },
]

describe('Prayer', () => {
  it('lists previous notes with previews, newest first', async () => {
    mockApi({ status: 200, body: ME }, { status: 200, body: NOTES })
    renderAt('/skills/prayer')
    expect(await screen.findByRole('heading', { name: 'Prayer & Bible' })).toBeInTheDocument()
    expect(await screen.findByText('2 entries', { exact: false })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('John 3:1-21')).toBeInTheDocument()
    expect(within(items[1]).getByText('Psalm 23')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    mockApi({ status: 200, body: ME }, { status: 200, body: [] })
    renderAt('/skills/prayer')
    expect(await screen.findByText(/No entries yet/)).toBeInTheDocument()
  })

  it('saves a new entry and puts it at the top', async () => {
    // The date field defaults to today; future dates are refused by the form.
    const created = { id: 3, read_on: todayIso(), passage: 'Romans 8', summary: 'No condemnation.' }
    const fetchMock = mockApi(
      { status: 200, body: ME },
      { status: 200, body: NOTES },
      { status: 201, body: created },
    )
    renderAt('/skills/prayer')
    const user = userEvent.setup()
    expect(await screen.findByLabelText('Date')).toHaveValue(todayIso())
    await user.type(screen.getByLabelText('Passage'), 'Romans 8')
    await user.type(screen.getByLabelText('What did you read or pray about?'), 'No condemnation.')
    await user.click(screen.getByRole('button', { name: 'Save entry' }))

    expect(await screen.findByText('Romans 8')).toBeInTheDocument()
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Romans 8')).toBeInTheDocument()
    expect(screen.getByLabelText('Passage')).toHaveValue('') // form cleared for the next one
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      read_on: todayIso(),
      passage: 'Romans 8',
      summary: 'No condemnation.',
    })
  })

  it('deletes a note only after confirming', async () => {
    const fetchMock = mockApi({ status: 200, body: ME }, { status: 200, body: NOTES }, { status: 204 })
    renderAt('/skills/prayer')
    const user = userEvent.setup()
    await user.click(await screen.findByText('Psalm 23'))
    const psalm = screen.getAllByRole('listitem')[1]
    await user.click(within(psalm).getByRole('button', { name: 'Delete' }))
    expect(fetchMock).toHaveBeenCalledTimes(2) // nothing sent yet
    await user.click(within(psalm).getByRole('button', { name: 'Delete for good' }))
    expect(fetchMock.mock.calls[2][0]).toBe('/api/prayer/notes/1')
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE')
    await screen.findByText('1 entry', { exact: false })
    expect(screen.queryByText('Psalm 23')).not.toBeInTheDocument()
  })
})
