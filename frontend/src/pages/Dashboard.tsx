import { Link } from 'react-router'
import { useUser } from '../hooks'
import { SKILLS, type Skill } from '../skills'

function SkillCard({ skill }: { skill: Skill }) {
  const body = (
    <>
      <span className="skill-icon">
        <img src={skill.icon} alt="" className="pixel" />
      </span>
      <span className="skill-text">
        <h3>{skill.name}</h3>
        <span className="muted">{skill.osrs} · Level 1</span>
      </span>
      {!skill.path && <span className="badge">Soon</span>}
    </>
  )
  return (
    <li className={skill.path ? 'skill live' : 'skill'}>
      {skill.path ? <Link to={skill.path}>{body}</Link> : <div>{body}</div>}
    </li>
  )
}

export default function Dashboard() {
  const user = useUser()
  return (
    <>
      <section className="hero">
        <h1>Welcome, {user.first_name}</h1>
        <p className="total">
          <img src="/icons/stats.png" alt="" className="pixel" />
          <span>Total level</span>
          <strong>{SKILLS.length}</strong>
        </p>
      </section>
      <h2 className="section-title">Skills</h2>
      <ul className="skills">
        {SKILLS.map((skill) => (
          <SkillCard key={skill.name} skill={skill} />
        ))}
      </ul>
    </>
  )
}
