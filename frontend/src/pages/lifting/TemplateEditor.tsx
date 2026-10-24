import { useState, type FormEvent } from 'react'
import { api } from '../../api'
import { WEEKDAYS, type Mode, type Template } from '../../lifting'

type Row = {
  key: number
  name: string
  sets: string
  mode: Mode
  rep_min: string
  rep_max: string
  seconds: string
}

let nextKey = 0
const blankRow = (): Row => ({
  key: nextKey++,
  name: '',
  sets: '3',
  mode: 'reps',
  rep_min: '8',
  rep_max: '12',
  seconds: '30',
})
const str = (n: number | null, fallback: string) => (n === null ? fallback : String(n))

type Props = { initial?: Template; onSaved: (t: Template) => void; onCancel: () => void }

export default function TemplateEditor({ initial, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [days, setDays] = useState<number[]>(initial?.weekdays ?? [])
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [rows, setRows] = useState<Row[]>(() =>
    initial
      ? initial.exercises.map((e) => ({
          key: nextKey++,
          name: e.name,
          sets: String(e.sets),
          mode: e.mode,
          rep_min: str(e.rep_min, '8'),
          rep_max: str(e.rep_max, '12'),
          seconds: str(e.seconds, '30'),
        }))
      : [blankRow()],
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  const update = (key: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (days.length === 0) return setError('Pick at least one training day.')
    const body = {
      title,
      weekdays: days,
      enabled,
      exercises: rows.map((r) => ({
        name: r.name,
        sets: Number(r.sets),
        mode: r.mode,
        ...(r.mode === 'reps'
          ? { rep_min: Number(r.rep_min), rep_max: Number(r.rep_max) }
          : { seconds: Number(r.seconds) }),
      })),
    }
    setBusy(true)
    try {
      const { status, data } = initial
        ? await api<Template>(`/api/lifting/templates/${initial.id}`, { method: 'PUT', body })
        : await api<Template>('/api/lifting/templates', { body })
      if (status === 200 || status === 201) onSaved(data)
      else if (status === 422) setError("Check each exercise: min reps can't be more than max reps.")
      else setError('Something went wrong. Try again.')
    } catch {
      setError("Can't reach FitScape right now. Try again in a moment.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card template-editor" onSubmit={submit} aria-labelledby="editor-title">
      <h2 id="editor-title">{initial ? 'Edit template' : 'New template'}</h2>
      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Push day"
          maxLength={80}
          required
        />
      </label>

      <fieldset>
        <legend>Repeats on</legend>
        <div className="day-picker">
          {WEEKDAYS.map((label, d) => (
            <label key={label} className={days.includes(d) ? 'chip on' : 'chip'}>
              <input type="checkbox" checked={days.includes(d)} onChange={() => toggleDay(d)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Exercises</legend>
        <ol className="exercise-rows">
          {rows.map((r, i) => (
            <li key={r.key} className="exercise-row">
              <span className="row-num" aria-hidden="true">
                {i + 1}
              </span>
              <label className="grow">
                {`Exercise ${i + 1} name`}
                <input
                  value={r.name}
                  onChange={(e) => update(r.key, { name: e.target.value })}
                  placeholder="e.g. Bench press"
                  maxLength={80}
                  required
                />
              </label>
              <label className="narrow">
                Sets
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={r.sets}
                  onChange={(e) => update(r.key, { sets: e.target.value })}
                  required
                />
              </label>
              <label>
                Type
                <select value={r.mode} onChange={(e) => update(r.key, { mode: e.target.value as Mode })}>
                  <option value="reps">Rep range</option>
                  <option value="seconds">Timed hold</option>
                </select>
              </label>
              {r.mode === 'reps' ? (
                <div className="range">
                  <label className="narrow">
                    Min reps
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={r.rep_min}
                      onChange={(e) => update(r.key, { rep_min: e.target.value })}
                      required
                    />
                  </label>
                  <span aria-hidden="true">–</span>
                  <label className="narrow">
                    Max reps
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={r.rep_max}
                      onChange={(e) => update(r.key, { rep_max: e.target.value })}
                      required
                    />
                  </label>
                </div>
              ) : (
                <label className="narrow">
                  Seconds
                  <input
                    type="number"
                    min={1}
                    max={3600}
                    value={r.seconds}
                    onChange={(e) => update(r.key, { seconds: e.target.value })}
                    required
                  />
                </label>
              )}
              <button
                type="button"
                className="ghost icon-btn"
                onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                disabled={rows.length === 1}
                aria-label={`Remove exercise ${i + 1}`}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="ghost" onClick={() => setRows((prev) => [...prev, blankRow()])}>
          + Add exercise
        </button>
      </fieldset>

      <label className="switch">
        <input
          type="checkbox"
          role="switch"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enabled (shows up when logging a workout)
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save template'}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
