import type { State } from './types'

/* A class carries two small facts on its chip: who it is for (kids, teens or adults) and how far along it is (beginner, intermediate or advanced).
   Both are read from the class's level, nothing is picked by hand. */
export type Audience = 'Kids' | 'Teens' | 'Adults'
export interface ClassMark {
  audience: Audience
  step: 0 | 1 | 2 | 3 // 0 = the level name does not say
}

export function classMark(state: Pick<State, 'levels'>, c: { level: string; code: string }): ClassMark | null {
  const level = (state.levels || []).find((l) => l.label === c.level)
  const text = `${level?.band || ''} ${c.level || ''}`
  let audience: Audience | null = /kids/i.test(text) ? 'Kids' : /teens?/i.test(text) ? 'Teens' : /adults?/i.test(text) ? 'Adults' : null
  if (!audience) {
    const m = /^ASO-([KTA])/i.exec(String(c.code || '').trim())
    if (m) audience = ({ K: 'Kids', T: 'Teens', A: 'Adults' } as const)[m[1].toUpperCase() as 'K' | 'T' | 'A']
  }
  if (!audience) return null
  const step = /beginn|starter|elementary/i.test(c.level || '') ? 1 : /intermed/i.test(c.level || '') ? 2 : /advanc|upper/i.test(c.level || '') ? 3 : 0
  return { audience, step }
}

export const markKey = (m: ClassMark) => `${m.audience[0]}${m.step}`
export const markLabel = (m: ClassMark) => `${m.audience}${m.step ? ' · ' + ['', 'Beginner', 'Intermediate', 'Advanced'][m.step] : ''}`
