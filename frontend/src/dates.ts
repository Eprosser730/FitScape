/** Today as YYYY-MM-DD in the local time zone (what a date input expects). */
export function todayIso(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

/** "Sat, Oct 24, 2026" for a YYYY-MM-DD date, without time-zone drift. */
export function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
