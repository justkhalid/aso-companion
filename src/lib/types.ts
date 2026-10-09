/* ASO Companion - shared types */

export type Theme = 'light' | 'dark' | 'auto'

export type Band = 'Kids' | 'Teens' | 'Adults' | ''

export interface Settings {
  theme: Theme
  coordinator: string
  institute: string
  year: string
  cc: string
  s1Start: string // ISO date
  s2Start: string
  s1Weeks: number
  adminCode: string
  ghToken?: string
  ghRepo?: string
  ghBranch?: string
  ghPath?: string
  ghAutoSave?: boolean
  ghAutoLoad?: boolean
  ghLastSync?: string
}

export interface LessonPlan {
  wu: string
  wuAlt?: string[]
  pres: string
  presAlt?: string[]
  prac: string
  pracAlt?: string[]
  ls: string
  re: string
  prod: string
  rw: string
  st: string
  g: [string, string][] // game name + description
  diff: string[]
  hw: string[]
  tip: string
  checklist?: string[] // assessment weeks only
}

export interface WeekSkills {
  L: string
  S: string
  R: string
  W: string
}

export interface Week {
  theme: string
  obj: string
  lang: string
  res: string
  urls: string[]
  act: string
  hw: string
  skills: WeekSkills
  lp?: LessonPlan
}

export interface Level {
  key: string
  label: string
  cefr: string
  band: Band
  tier?: string
  desc?: string
  weeks: Week[]
}

export interface ClassEntry {
  id: string
  code: string
  level: string
  teacher: string
  room: string
  days: string[] // ['Mon', 'Wed']
  time: string // '14:00-16:00'
}

/* how often a club or event repeats */
export type Freq = 'weekly' | 'biweekly' | 'monthly'

export interface Club {
  id: string
  name: string
  desc: string
  days: string[]
  time: string
  room: string
  lead: string
  vol: string[]
  url: string
  poster?: string
  icon?: string // key from CLUB_ICONS, rendered on calendar chips
  placeholder?: boolean
  freq?: Freq // how often the sessions repeat (default weekly)
  from?: string // ISO date the series starts (optional)
  until?: string // ISO date the series ends (optional)
}

/* legacy 'none' is treated as 'once' everywhere */
export type EventRecur = 'once' | 'weekly' | 'biweekly' | 'monthly' | 'none'

export interface EventEntry {
  id: string
  title: string
  desc: string
  recur: EventRecur
  day?: string // weekday key for repeating events
  date?: string // ISO date for one-off events
  time: string
  place: string
  from?: string // ISO date the series starts (repeating events)
  until?: string // ISO date the series ends (repeating events)
  poster?: string
  icon?: string // key from CLUB_ICONS, rendered on calendar chips
}

export interface Volunteer {
  id: string
  name: string
  role: string
  phone: string
  aso: string
  email: string
}

export interface LibraryFolder {
  id: string
  name: string
  desc: string
  url: string
  sk: string[] // ['L','S','R','W']
}

export interface Note {
  week: number
  text: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  phone: string
  email: string
}

export interface State {
  v: 1
  _rev: number
  settings: Settings
  levels: Level[]
  classes: ClassEntry[]
  clubs: Club[]
  events: EventEntry[]
  volunteers: Volunteer[]
  library: LibraryFolder[]
  libraryPins: string[]
  notes: Note[]
  team: TeamMember[]
  rootUrl?: string
}

/* ---- view routing (single-page app) ---- */
export type View =
  | 'home'
  | 'eltaso'
  | 'level-detail'
  | 'clubs'
  | 'resources'
  | 'login'
  | 'settings'
  | 'intern'
  | 'classes'
  | 'team'
  | 'library'
  | 'reports'
  | 'intern-clubs'
  | 'intern-events'
  | 'intern-volunteers'

export type Side = 'elt' | 'intern'

export type ClubViewMode = 'list' | 'grid'
export type CalendarViewMode = 'grid' | 'list'
