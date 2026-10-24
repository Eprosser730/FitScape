// Running: shapes from /api/running/runs and the small helpers the pages share.
export type SegmentKind = 'run' | 'walk'
export type Segment = { kind: SegmentKind; seconds: number }
export type Run = {
  id: number
  ran_on: string // YYYY-MM-DD
  distance_mi: string // Decimal from the API, e.g. "3.10"
  notes: string | null
  segments: Segment[]
}

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Monday (YYYY-MM-DD) of the week `iso` falls in, `weeksBack` weeks earlier. Weeks start Monday. */
export function weekStart(iso: string, weeksBack = 0): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * weeksBack)
  return isoOf(d)
}

/** Miles run this week and last week, relative to `today` (YYYY-MM-DD). */
export function weeklyMiles(runs: Run[], today: string): { thisWeek: number; lastWeek: number } {
  const [thisMonday, lastMonday] = [weekStart(today), weekStart(today, 1)]
  let thisWeek = 0
  let lastWeek = 0
  for (const r of runs) {
    const week = weekStart(r.ran_on)
    if (week === thisMonday) thisWeek += Number(r.distance_mi)
    else if (week === lastMonday) lastWeek += Number(r.distance_mi)
  }
  return { thisWeek, lastWeek }
}

export const formatMi = (n: number) => `${n.toFixed(2)} mi`

/** 125 → "2:05", 3725 → "1:02:05". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

export const totalSeconds = (segments: Segment[]) => segments.reduce((sum, s) => sum + s.seconds, 0)
