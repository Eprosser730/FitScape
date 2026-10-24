// Shared lifting types and labels (templates now, workouts next).
export type Mode = 'reps' | 'seconds'

export type Exercise = {
  name: string
  sets: number
  mode: Mode
  rep_min: number | null
  rep_max: number | null
  seconds: number | null
}

export type Template = {
  id: number
  title: string
  weekdays: number[]
  enabled: boolean
  exercises: Exercise[]
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** "Mon · Wed · Fri", or "Every day". */
export function daysLabel(weekdays: number[]): string {
  if (weekdays.length === 7) return 'Every day'
  return weekdays.map((d) => WEEKDAYS[d]).join(' · ')
}

/** "4 × 6–10 reps", "3 × 8 reps", or "3 × 60 s hold". */
export function targetLabel(e: Exercise): string {
  if (e.mode === 'seconds') return `${e.sets} × ${e.seconds} s hold`
  const reps = e.rep_min === e.rep_max ? `${e.rep_min}` : `${e.rep_min}–${e.rep_max}`
  return `${e.sets} × ${reps} reps`
}
