import { useEffect, useState } from 'react'
import { api } from '../../api'
import { formatLb, setCount, setLabel, targetLabel, volumeLb, type Workout } from '../../lifting'

function DateBlock({ iso }: { iso: string }) {
  const d = new Date(`${iso}T00:00:00`)
  return (
    <time className="date-block" dateTime={iso}>
      <span className="month">{d.toLocaleDateString(undefined, { month: 'short' })}</span>
      <span className="day">{d.getDate()}</span>
      <span className="weekday">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
    </time>
  )
}

function WorkoutCard({ workout, onDelete }: { workout: Workout; onDelete: (id: number) => void }) {
  const [confirming, setConfirming] = useState(false)
  const volume = volumeLb(workout.exercises)
  return (
    <li>
      <details className="workout">
        <summary>
          <DateBlock iso={workout.performed_on} />
          <span className="workout-title">
            <strong>{workout.title}</strong>
            <span className="muted small">
              {workout.exercises.length} exercises · {setCount(workout.exercises)} sets
              {volume > 0 ? ` · ${formatLb(volume)}` : ''}
            </span>
          </span>
          <span className="chevron" aria-hidden="true">
            ›
          </span>
        </summary>
        <div className="workout-body">
          {workout.exercises.map((e, i) => (
            <section key={i} className="workout-exercise">
              <h4>
                {e.name}
                <span className="muted small">
                  {targetLabel({ ...e, sets: e.sets.length, seconds: e.target_seconds })}
                </span>
              </h4>
              <ol className="set-chips">
                {e.sets.map((s, j) => (
                  <li key={j}>
                    <span className="set-badge">{j + 1}</span>
                    {setLabel(e.mode, s)}
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {workout.notes && <p className="workout-notes">{workout.notes}</p>}
          <div className="note-actions">
            {confirming ? (
              <>
                <button type="button" className="danger" onClick={() => onDelete(workout.id)}>
                  Delete for good
                </button>
                <button type="button" className="ghost" onClick={() => setConfirming(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className="ghost" onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </details>
    </li>
  )
}

/** Every saved workout, newest first; expand one to see each set. */
export default function Archive({ justSaved }: { justSaved?: Workout | null }) {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Workout[]>('/api/lifting/workouts')
      .then(({ status, data }) => {
        if (status === 200) setWorkouts(data)
        else setError("Couldn't load your workouts. Refresh to try again.")
      })
      .catch(() => setError("Can't reach FitScape right now. Refresh to try again."))
  }, [])

  async function remove(id: number) {
    setError('')
    try {
      const { status } = await api(`/api/lifting/workouts/${id}`, { method: 'DELETE' })
      if (status === 204 || status === 404) setWorkouts((prev) => (prev ?? []).filter((w) => w.id !== id))
      else setError("Couldn't delete that workout. Try again.")
    } catch {
      setError("Can't reach FitScape right now. Try again in a moment.")
    }
  }

  return (
    <section aria-labelledby="archive-title">
      <h2 id="archive-title" className="section-title">
        Workout archive
      </h2>
      {justSaved && (
        <p className="success" role="status">
          Saved {justSaved.title}. Nice work.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {workouts === null && !error && <p className="muted">Loading…</p>}
      {workouts?.length === 0 && <p className="empty muted">No workouts yet. Log one and it lands here.</p>}
      <ul className="workouts">
        {workouts?.map((w) => (
          <WorkoutCard key={w.id} workout={w} onDelete={remove} />
        ))}
      </ul>
    </section>
  )
}
