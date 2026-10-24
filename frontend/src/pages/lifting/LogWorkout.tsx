import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../../api'
import { todayIso } from '../../dates'
import {
  formatLb,
  setCount,
  targetLabel,
  volumeLb,
  weekdayIndex,
  type Mode,
  type Template,
  type Workout,
} from '../../lifting'

type SetRow = { reps: string; seconds: string; weight: string }
type ExerciseRow = {
  name: string
  mode: Mode
  rep_min: number | null
  rep_max: number | null
  target_seconds: number | null
  sets: SetRow[]
}

const blankSet = (): SetRow => ({ reps: '', seconds: '', weight: '' })

function fromTemplate(t: Template): ExerciseRow[] {
  return t.exercises.map((e) => ({
    name: e.name,
    mode: e.mode,
    rep_min: e.rep_min,
    rep_max: e.rep_max,
    target_seconds: e.seconds,
    sets: Array.from({ length: e.sets }, blankSet),
  }))
}

const num = (v: string) => (v.trim() === '' ? null : Number(v))

/** Pick an enabled template, fill in what you actually did, save it to the archive. */
export default function LogWorkout({
  onSaved,
  onManageTemplates,
}: {
  onSaved: (w: Workout) => void
  onManageTemplates: () => void
}) {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [performedOn, setPerformedOn] = useState(todayIso)
  const [rows, setRows] = useState<ExerciseRow[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Template[]>('/api/lifting/templates')
      .then(({ status, data }) => {
        if (status !== 200) return setError("Couldn't load your templates. Refresh to try again.")
        const enabled = data.filter((t) => t.enabled)
        setTemplates(enabled)
        // Start on today's planned session, if there is one.
        const today = enabled.find((t) => t.weekdays.includes(weekdayIndex()))
        if (today) {
          setTemplateId(today.id)
          setRows(fromTemplate(today))
        }
      })
      .catch(() => setError("Can't reach FitScape right now. Refresh to try again."))
  }, [])

  const template = templates?.find((t) => t.id === templateId) ?? null

  function choose(id: string) {
    const t = templates?.find((x) => x.id === Number(id)) ?? null
    setTemplateId(t?.id ?? null)
    setRows(t ? fromTemplate(t) : [])
    setError('')
  }

  const setField = (ex: number, set: number, field: keyof SetRow, value: string) =>
    setRows((prev) =>
      prev.map((r, i) =>
        i === ex ? { ...r, sets: r.sets.map((s, j) => (j === set ? { ...s, [field]: value } : s)) } : r,
      ),
    )
  const addSet = (ex: number) =>
    setRows((prev) => prev.map((r, i) => (i === ex ? { ...r, sets: [...r.sets, blankSet()] } : r)))
  const dropSet = (ex: number) =>
    setRows((prev) => prev.map((r, i) => (i === ex ? { ...r, sets: r.sets.slice(0, -1) } : r)))

  // Live totals for the summary bar.
  const totals = useMemo(() => {
    const parsed = rows.map((r) => ({
      mode: r.mode,
      sets: r.sets.map((s) => ({ reps: num(s.reps), weight_lb: num(s.weight) })),
    }))
    return { sets: setCount(rows), volume: volumeLb(parsed) }
  }, [rows])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!template) return
    setError('')
    setBusy(true)
    const body = {
      template_id: template.id,
      title: template.title,
      performed_on: performedOn,
      notes: notes.trim() || null,
      exercises: rows.map((r) => ({
        name: r.name,
        mode: r.mode,
        rep_min: r.rep_min,
        rep_max: r.rep_max,
        target_seconds: r.target_seconds,
        sets: r.sets.map((s) => ({
          reps: r.mode === 'reps' ? num(s.reps) : null,
          seconds: r.mode === 'seconds' ? num(s.seconds) : null,
          weight_lb: num(s.weight),
        })),
      })),
    }
    try {
      const { status, data } = await api<Workout>('/api/lifting/workouts', { body })
      if (status === 201) onSaved(data)
      else if (status === 422) setError('Fill in every set (reps or seconds). Weights can have one decimal.')
      else setError('Something went wrong. Try again.')
    } catch {
      setError("Can't reach FitScape right now. Try again in a moment.")
    } finally {
      setBusy(false)
    }
  }

  if (templates === null) return error ? <p className="error" role="alert">{error}</p> : <p className="muted">Loading…</p>

  if (templates.length === 0) {
    return (
      <div className="empty muted">
        <p>No enabled templates yet. A template sets up the exercises so logging is quick.</p>
        <button type="button" className="ghost" onClick={onManageTemplates}>
          Create a template
        </button>
      </div>
    )
  }

  return (
    <form className="log-workout" onSubmit={submit} aria-label="Log a workout">
      <div className="card log-controls">
        <label className="grow">
          Template
          <select value={templateId ?? ''} onChange={(e) => choose(e.target.value)} required>
            <option value="" disabled>
              Choose a template…
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.weekdays.includes(weekdayIndex()) ? ' · today' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={performedOn}
            max={todayIso()}
            onChange={(e) => setPerformedOn(e.target.value)}
            required
          />
        </label>
      </div>

      {template && (
        <>
          <ol className="log-exercises">
            {rows.map((r, ei) => (
              <li key={`${template.id}-${ei}`} className="card log-exercise">
                <header>
                  <span className="row-num">{ei + 1}</span>
                  <h3>{r.name}</h3>
                  <span className="target-chip">
                    {targetLabel({ ...r, sets: r.sets.length, seconds: r.target_seconds })}
                  </span>
                </header>
                <div className="set-grid" role="group" aria-label={`${r.name} sets`}>
                  {r.sets.map((s, si) => (
                    <div key={si} className="set-row">
                      <span className="set-badge" aria-hidden="true">
                        {si + 1}
                      </span>
                      {r.mode === 'reps' ? (
                        <>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={1000}
                            value={s.reps}
                            onChange={(e) => setField(ei, si, 'reps', e.target.value)}
                            placeholder={r.rep_min === r.rep_max ? `${r.rep_min}` : `${r.rep_min}–${r.rep_max}`}
                            aria-label={`${r.name} set ${si + 1} reps`}
                            required
                          />
                          <span className="unit">reps ×</span>
                        </>
                      ) : (
                        <>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={36000}
                            value={s.seconds}
                            onChange={(e) => setField(ei, si, 'seconds', e.target.value)}
                            placeholder={`${r.target_seconds ?? ''}`}
                            aria-label={`${r.name} set ${si + 1} seconds`}
                            required
                          />
                          <span className="unit">s +</span>
                        </>
                      )}
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={2000}
                        step={0.1}
                        value={s.weight}
                        onChange={(e) => setField(ei, si, 'weight', e.target.value)}
                        placeholder="0"
                        aria-label={`${r.name} set ${si + 1} weight in pounds`}
                      />
                      <span className="unit">lb</span>
                    </div>
                  ))}
                </div>
                <div className="set-actions">
                  <button type="button" className="ghost small-btn" onClick={() => addSet(ei)}>
                    + Set
                  </button>
                  <button
                    type="button"
                    className="ghost small-btn"
                    onClick={() => dropSet(ei)}
                    disabled={r.sets.length === 1}
                  >
                    − Set
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <label className="card notes-field">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Anything to change next time?"
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
              <strong>{totals.sets}</strong> sets
              <span aria-hidden="true"> · </span>
              <strong>{formatLb(totals.volume)}</strong> volume
            </p>
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save workout'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
