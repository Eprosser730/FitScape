import { describe, expect, it } from 'vitest'
import { formatDuration, weekStart, weeklyMiles, type Run } from './running'

const run = (ran_on: string, distance_mi: string): Run => ({ id: 1, ran_on, distance_mi, notes: null, segments: [] })

describe('running helpers', () => {
  it('weeks start on Monday', () => {
    expect(weekStart('2026-10-24')).toBe('2026-10-19') // Saturday → Monday
    expect(weekStart('2026-10-25')).toBe('2026-10-19') // Sunday still belongs to that week
    expect(weekStart('2026-10-19')).toBe('2026-10-19')
    expect(weekStart('2026-11-02', 1)).toBe('2026-10-26') // a week back, across a month
  })

  it('totals this week and last week only', () => {
    const runs = [
      run('2026-10-24', '3.10'),
      run('2026-10-19', '2.00'),
      run('2026-10-18', '5.25'), // last Sunday → last week
      run('2026-10-12', '1.00'),
      run('2026-10-11', '9.00'), // two weeks ago: ignored
    ]
    const { thisWeek, lastWeek } = weeklyMiles(runs, '2026-10-24')
    expect(thisWeek).toBeCloseTo(5.1)
    expect(lastWeek).toBeCloseTo(6.25)
  })

  it('formats durations', () => {
    expect(formatDuration(120)).toBe('2:00')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3725)).toBe('1:02:05')
  })
})
