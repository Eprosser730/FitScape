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

export type WorkoutSet = { reps: number | null; seconds: number | null; weight_lb: string | null }

export type WorkoutExercise = {
  name: string
  mode: Mode
  rep_min: number | null
  rep_max: number | null
  target_seconds: number | null
  sets: WorkoutSet[]
}

export type Workout = {
  id: number
  template_id: number | null
  title: string
  performed_on: string
  notes: string | null
  exercises: WorkoutExercise[]
}

/** Monday = 0 ... Sunday = 6, matching the templates. */
export function weekdayIndex(date = new Date()): number {
  return (date.getDay() + 6) % 7
}

/** Total pounds moved: reps x weight over every rep set. Holds do not count. */
export function volumeLb(exercises: { mode: Mode; sets: { reps: number | null; weight_lb: string | number | null }[] }[]): number {
  return exercises
    .filter((e) => e.mode === 'reps')
    .flatMap((e) => e.sets)
    .reduce((sum, s) => sum + (s.reps ?? 0) * Number(s.weight_lb ?? 0), 0)
}

export function setCount(exercises: { sets: unknown[] }[]): number {
  return exercises.reduce((n, e) => n + e.sets.length, 0)
}

/** "10 × 135 lb", "12 reps", "62 s", or "55 s · 25 lb". */
export function setLabel(mode: Mode, s: WorkoutSet): string {
  const weight = s.weight_lb !== null && Number(s.weight_lb) > 0 ? `${Number(s.weight_lb)} lb` : ''
  if (mode === 'seconds') return weight ? `${s.seconds} s · ${weight}` : `${s.seconds} s`
  return weight ? `${s.reps} × ${weight}` : `${s.reps} reps`
}

export const formatLb = (n: number) => `${Math.round(n).toLocaleString()} lb`
