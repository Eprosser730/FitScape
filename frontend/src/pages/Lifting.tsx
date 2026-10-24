import { useState } from 'react'
import { useSearchParams } from 'react-router'
import SkillHeader from '../components/SkillHeader'
import type { Workout } from '../lifting'
import { SKILLS } from '../skills'
import Archive from './lifting/Archive'
import LogWorkout from './lifting/LogWorkout'
import Templates from './lifting/Templates'

const LIFTING = SKILLS.find((s) => s.osrs === 'Strength')!
const TABS = [
  ['log', 'Log workout'],
  ['archive', 'Archive'],
  ['templates', 'Templates'],
] as const
type Tab = (typeof TABS)[number][0]

export default function Lifting() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.some(([id]) => id === params.get('tab')) ? (params.get('tab') as Tab) : 'log'
  const [justSaved, setJustSaved] = useState<Workout | null>(null)
  const go = (next: Tab) => {
    setJustSaved(null)
    setParams(next === 'log' ? {} : { tab: next })
  }

  return (
    <>
      <SkillHeader skill={LIFTING} />
      <nav className="tabs" aria-label="Lifting sections">
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
        <LogWorkout
          onSaved={(w) => {
            setParams({ tab: 'archive' })
            setJustSaved(w)
          }}
          onManageTemplates={() => go('templates')}
        />
      )}
      {tab === 'archive' && <Archive justSaved={justSaved} />}
      {tab === 'templates' && <Templates />}
    </>
  )
}
