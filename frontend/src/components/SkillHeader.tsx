import type { ReactNode } from 'react'
import type { Skill } from '../skills'

/** The banner at the top of every skill page: big pixel icon, name, and OSRS skill. */
export default function SkillHeader({ skill, children }: { skill: Skill; children?: ReactNode }) {
  return (
    <header className="skill-header">
      <span className="skill-icon large">
        <img src={skill.icon} alt="" className="pixel" />
      </span>
      <div>
        <h1>{skill.name}</h1>
        <p className="muted">
          {skill.osrs} · Level 1{children ? ' · ' : ''}
          {children}
        </p>
      </div>
    </header>
  )
}
