import { useState } from 'react'
import { api } from '../../api'
import { formatDay } from '../../dates'
import { formatDuration, totalSeconds, type Run } from '../../running'

type SortKey = 'date' | 'distance'
type Sort = { key: SortKey; desc: boolean }

const compare: Record<SortKey, (a: Run, b: Run) => number> = {
  date: (a, b) => a.ran_on.localeCompare(b.ran_on) || a.id - b.id,
  distance: (a, b) => Number(a.distance_mi) - Number(b.distance_mi) || a.ran_on.localeCompare(b.ran_on),
}

const intervalsLabel = (run: Run) =>
  run.segments.map((s) => `${s.kind === 'run' ? 'Run' : 'Walk'} ${formatDuration(s.seconds)}`).join(' · ')

function SortHeader({ label, col, sort, onSort }: { label: string; col: SortKey; sort: Sort; onSort: (k: SortKey) => void }) {
  const active = sort.key === col
  return (
    <th scope="col" role="columnheader" aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'} className={col === 'distance' ? 'num' : undefined}>
      <button type="button" className={active ? 'sort active' : 'sort'} onClick={() => onSort(col)}>
        {label}
        <span aria-hidden="true">{active ? (sort.desc ? ' ▼' : ' ▲') : ' ↕'}</span>
      </button>
    </th>
  )
}

function DeleteCell({ id, onDelete }: { id: number; onDelete: (id: number) => void }) {
  const [confirming, setConfirming] = useState(false)
  return confirming ? (
    <span className="row-actions">
      <button type="button" className="danger small-btn" onClick={() => onDelete(id)}>
        Delete for good
      </button>
      <button type="button" className="ghost small-btn" onClick={() => setConfirming(false)}>
        Keep
      </button>
    </span>
  ) : (
    <button type="button" className="ghost small-btn" onClick={() => setConfirming(true)}>
      Delete
    </button>
  )
}

/** Every run in a spreadsheet-style table; click Date or Distance to sort. */
export default function RunArchive({
  runs,
  justSaved,
  onDeleted,
}: {
  runs: Run[]
  justSaved: boolean
  onDeleted: (id: number) => void
}) {
  const [sort, setSort] = useState<Sort>({ key: 'date', desc: true })
  const [error, setError] = useState('')
  // Clicking the active column flips the direction; a new column starts at biggest/newest first.
  const onSort = (key: SortKey) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))
  const sorted = [...runs].sort((a, b) => (sort.desc ? -1 : 1) * compare[sort.key](a, b))

  async function remove(id: number) {
    setError('')
    try {
      const { status } = await api(`/api/running/runs/${id}`, { method: 'DELETE' })
      if (status === 204 || status === 404) onDeleted(id)
      else setError("Couldn't delete that run. Try again.")
    } catch {
      setError("Can't reach FitScape right now. Try again in a moment.")
    }
  }

  return (
    <section aria-labelledby="run-archive-title">
      <h2 id="run-archive-title" className="section-title">
        Run archive
      </h2>
      {justSaved && (
        <p className="success" role="status">
          Run saved. Nice work.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {runs.length === 0 ? (
        <p className="empty muted">No runs yet. Log one and it lands here.</p>
      ) : (
        <div className="card table-wrap">
          {/* Explicit roles: on phones CSS turns rows into cards, and Safari drops table
              semantics for VoiceOver whenever a table's display is changed. */}
          <table className="run-table" role="table">
            <thead role="rowgroup">
              <tr role="row">
                <SortHeader label="Date" col="date" sort={sort} onSort={onSort} />
                <SortHeader label="Distance" col="distance" sort={sort} onSort={onSort} />
                <th scope="col" role="columnheader" className="num">
                  Time
                </th>
                <th scope="col" role="columnheader">Intervals</th>
                <th scope="col" role="columnheader">Notes</th>
                <th scope="col" role="columnheader">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {sorted.map((r) => (
                <tr key={r.id} role="row">
                  <td role="cell" className="c-date nowrap">{formatDay(r.ran_on)}</td>
                  <td role="cell" className="c-dist num strong">{Number(r.distance_mi).toFixed(2)} mi</td>
                  <td role="cell" className="c-time num" data-empty={!r.segments.length || undefined}>
                    {r.segments.length ? formatDuration(totalSeconds(r.segments)) : '—'}
                  </td>
                  <td role="cell" className="c-int muted small" data-empty={!r.segments.length || undefined}>
                    {intervalsLabel(r) || '—'}
                  </td>
                  <td role="cell" className="c-notes notes-cell">{r.notes ?? ''}</td>
                  <td role="cell" className="c-act nowrap">
                    <DeleteCell id={r.id} onDelete={remove} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
