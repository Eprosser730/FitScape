import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { api } from '../api'
import SkillHeader from '../components/SkillHeader'
import { todayIso } from '../dates'
import { formatMi, weeklyMiles, type Run } from '../running'
import { SKILLS } from '../skills'
import LogRun from './running/LogRun'
import RunArchive from './running/RunArchive'

const RUNNING = SKILLS.find((s) => s.osrs === 'Agility')!
const TABS = [
  ['log', 'Log New Run'],
  ['archive', 'Archive'],
] as const
type Tab = (typeof TABS)[number][0]

function Mileage({ runs }: { runs: Run[] }) {
  const { thisWeek, lastWeek } = weeklyMiles(runs, todayIso())
  const diff = thisWeek - lastWeek
  return (
    <section className="mileage" aria-label="Weekly mileage">
      <div className="card mileage-card current">
        <span className="section-title">This week</span>
        <strong>{formatMi(thisWeek)}</strong>
        {lastWeek > 0 && (
          <span className={diff >= 0 ? 'success small' : 'muted small'}>
            {diff >= 0 ? '+' : '−'}
            {formatMi(Math.abs(diff))} vs last week
          </span>
        )}
      </div>
      <div className="card mileage-card">
        <span className="section-title">Last week</span>
        <strong>{formatMi(lastWeek)}</strong>
      </div>
    </section>
  )
}

/** Running (Agility): weekly mileage up top, then log a run or browse the archive. */
export default function Running() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'archive' ? 'archive' : 'log'
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    api<Run[]>('/api/running/runs')
      .then(({ status, data }) => {
        if (status === 200) setRuns(data)
        else setError("Couldn't load your runs. Refresh to try again.")
      })
      .catch(() => setError("Can't reach FitScape right now. Refresh to try again."))
  }, [])

  const go = (next: Tab) => {
    setJustSaved(false)
    setParams(next === 'log' ? {} : { tab: next })
  }

  return (
    <>
      <SkillHeader skill={RUNNING} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {runs === null && !error && <p className="muted">Loading…</p>}
      {runs && (
        <>
          <Mileage runs={runs} />
          <nav className="tabs" aria-label="Running sections">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'tab active' : 'tab'}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => go(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab === 'log' && (
            <LogRun
              onSaved={(run) => {
                setRuns((prev) => [run, ...(prev ?? [])])
                setParams({ tab: 'archive' })
                setJustSaved(true)
              }}
            />
          )}
          {tab === 'archive' && (
            <RunArchive
              runs={runs}
              justSaved={justSaved}
              onDeleted={(id) => setRuns((prev) => (prev ?? []).filter((r) => r.id !== id))}
            />
          )}
        </>
      )}
    </>
  )
}
