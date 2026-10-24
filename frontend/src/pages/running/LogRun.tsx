import { useState, type FormEvent } from 'react'
import { api } from '../../api'
import { todayIso } from '../../dates'
import { formatDuration, totalSeconds, type Run, type SegmentKind } from '../../running'

type Row = { kind: SegmentKind; min: string; sec: string }

const toSeconds = (r: Row) => Number(r.min || 0) * 60 + Number(r.sec || 0)

/** Total distance, then optional run/walk intervals in order, then notes. */
export default function LogRun({ onSaved }: { onSaved: (run: Run) => void }) {
  const [ranOn, setRanOn] = useState(todayIso)
  const [distance, setDistance] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const setField = (i: number, field: keyof Row, value: string) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)))
  // A new line flips run ↔ walk from the one above, so "2 min run, 2 min walk" repeats in one click each.
  const addRow = () =>
    setRows((prev) => {
      const last = prev.at(-1)
      const kind: SegmentKind = last?.kind === 'run' ? 'walk' : 'run'
      return [...prev, { kind, min: last?.min ?? '', sec: last?.sec ?? '' }]
    })
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, j) => j !== i))

  const segments = rows.map((r) => ({ kind: r.kind, seconds: toSeconds(r) }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (segments.some((s) => s.seconds < 1)) return setError('Give every interval a time, or remove it.')
    setError('')
    setBusy(true)
    const body = { ran_on: ranOn, distance_mi: Number(distance), notes: notes.trim() || null, segments }
    try {
      const { status, data } = await api<Run>('/api/running/runs', { body })
      if (status === 201) onSaved(data)
      else if (status === 422) setError('Check the distance (up to 2 decimals, max 200 mi).')
      else setError('Something went wrong. Try again.')
    } catch {
      setError("Can't reach FitScape right now. Try again in a moment.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="log-run" onSubmit={submit} aria-label="Log a run">
      <div className="card log-controls">
        <label className="grow">
          Total distance (mi)
          <input
            type="number"
            inputMode="decimal"
            min={0.01}
            max={200}
            step={0.01}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="3.10"
            required
          />
        </label>
        <label>
          Date
          <input type="date" value={ranOn} max={todayIso()} onChange={(e) => setRanOn(e.target.value)} required />
        </label>
      </div>

      <section className="card intervals" aria-labelledby="intervals-title">
        <div className="section-head">
          <h3 id="intervals-title">Intervals (optional)</h3>
          {rows.length > 0 && <span className="target-chip">{formatDuration(totalSeconds(segments))} total</span>}
        </div>
        {rows.length === 0 && <p className="muted small">Add lines like 2:00 run → 2:00 walk, in order.</p>}
        <ol className="interval-rows">
          {rows.map((r, i) => (
            <li key={i} className={`interval-row ${r.kind}`}>
              <span className="row-num">{i + 1}</span>
              <select value={r.kind} onChange={(e) => setField(i, 'kind', e.target.value)} aria-label={`Interval ${i + 1} type`}>
                <option value="run">Run</option>
                <option value="walk">Walk</option>
              </select>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                value={r.min}
                onChange={(e) => setField(i, 'min', e.target.value)}
                placeholder="0"
                aria-label={`Interval ${i + 1} minutes`}
              />
              <span className="unit">min</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={r.sec}
                onChange={(e) => setField(i, 'sec', e.target.value)}
                placeholder="00"
                aria-label={`Interval ${i + 1} seconds`}
              />
              <span className="unit">sec</span>
              <button type="button" className="ghost icon-btn" onClick={() => removeRow(i)} aria-label={`Remove interval ${i + 1}`}>
                ×
              </button>
            </li>
          ))}
        </ol>
        <div className="set-actions">
          <button type="button" className="ghost small-btn" onClick={addRow} disabled={rows.length >= 50}>
            + Interval
          </button>
        </div>
      </section>

      <label className="card notes-field">
        Notes (optional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Route, weather, how your legs felt…"
          maxLength={2000}
          rows={3}
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="log-summary">
        <p>
          <strong>{distance ? Number(distance).toFixed(2) : '0.00'}</strong> mi
          {rows.length > 0 && (
            <>
              <span aria-hidden="true"> · </span>
              <strong>{rows.length}</strong> intervals
            </>
          )}
        </p>
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save run'}
        </button>
      </div>
    </form>
  )
}
