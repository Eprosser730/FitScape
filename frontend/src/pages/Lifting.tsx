import SkillHeader from '../components/SkillHeader'
import { SKILLS } from '../skills'
import Templates from './lifting/Templates'

const LIFTING = SKILLS.find((s) => s.osrs === 'Strength')!

export default function Lifting() {
  return (
    <>
      <SkillHeader skill={LIFTING} />
      <Templates />
    </>
  )
}
