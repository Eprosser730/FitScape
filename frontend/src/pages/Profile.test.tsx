import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockApi, renderAt } from '../test-utils'

const ME = { username: 'ethan', first_name: 'Ethan', last_name: 'Prosser' }
const SAVED = {
  gender: 'male', age: 22, height_ft: 5, height_in: 11, weight_lb: '180.5', bmi: 25.2, bmi_category: 'Overweight',
}

describe('Profile', () => {
  it('asks a new user for their details and shows the BMI after saving', async () => {
    const fetchMock = mockApi(
      { status: 200, body: ME },
      { status: 404, body: { code: 'no_profile' } },
      { status: 200, body: SAVED },
    )
    renderAt('/profile?welcome')
    expect(await screen.findByRole('heading', { name: 'Tell us about you' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip for now' })).toHaveAttribute('href', '/')

    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Gender'), 'male')
    await user.type(screen.getByLabelText('Age'), '22')
    await user.type(screen.getByLabelText('Feet'), '5')
    await user.type(screen.getByLabelText('Inches'), '11')
    await user.type(screen.getByLabelText('Weight (lb)'), '180.5')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('25.2')).toBeInTheDocument()
    expect(screen.getByText('Overweight')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved.')
    const [url, init] = fetchMock.mock.calls[2]
    expect(url).toBe('/api/profile')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ gender: 'male', age: 22, height_ft: 5, height_in: 11, weight_lb: 180.5 })
  })

  it('pre-fills an existing profile and shows its BMI', async () => {
    mockApi({ status: 200, body: ME }, { status: 200, body: SAVED })
    renderAt('/profile')
    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument()
    expect(screen.getByLabelText('Age')).toHaveValue(22)
    expect(screen.getByLabelText('Weight (lb)')).toHaveValue(180.5)
    expect(screen.getByText('25.2')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Skip for now' })).not.toBeInTheDocument()
  })

  it('explains out-of-range values', async () => {
    mockApi({ status: 200, body: ME }, { status: 200, body: SAVED }, { status: 422 })
    renderAt('/profile')
    await userEvent.click(await screen.findByRole('button', { name: 'Save profile' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the values')
  })
})
