// Tracked activities and the OSRS skill each one levels up (issue #3). `path` = page is live.
export type Skill = { name: string; osrs: string; icon: string; path?: string }

export const SKILLS: Skill[] = [
  { name: 'Running', osrs: 'Agility', icon: '/icons/agility.png', path: '/skills/running' },
  { name: 'Food', osrs: 'Cooking', icon: '/icons/cooking.png' },
  // Water has no obvious OSRS skill; Fishing is a provisional pick, easy to swap.
  { name: 'Water', osrs: 'Fishing', icon: '/icons/fishing.png' },
  { name: 'Lifting', osrs: 'Strength', icon: '/icons/strength.png', path: '/skills/lifting' },
  { name: 'Prayer & Bible', osrs: 'Prayer', icon: '/icons/prayer.png', path: '/skills/prayer' },
  { name: 'Weight', osrs: 'Hitpoints', icon: '/icons/hitpoints.png' },
]
