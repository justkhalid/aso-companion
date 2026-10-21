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
  /** Only present in admin responses; the server strips both codes for visitors. */
  adminCode?: string
  teacherCode?: string
  internCode?: string
  teacherLoginRequired?: boolean // default off: anyone can open the teachers' pages; on = they need the teachers' code
  internLoginRequired?: boolean // default off: anyone can open the interns' page; on = they need the interns' code
  hiddenLevels?: string[] // level keys teachers do not see on the ELTASO tab
  showAccessBox?: boolean // main page: the box that sends teachers and interns to their own pages
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

/* one Drive item a teacher opens for a lesson stage */
export type KitStage = 'wu' | 'pres' | 'prac' | 'ls' | 're' | 'prod' | 'rw' | 'st'

export interface KitItem {
  l: string // label shown to the teacher
  s: KitStage // lesson stage the item serves
  u: string // Drive link (file or folder)
  t: 'file' | 'folder'
}

/* optional occasion (holiday / national day) that falls in the week */
export interface WeekOccasion {
  act: string
  hw: string
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
  kit?: KitItem[]
  occ?: WeekOccasion
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

/* Social kit: what the club kit remembers about one club or event (only what differs from what the kit works out itself) */
export interface KitOverrides {
  kicker?: string // small line above the name (WEEKLY CLUB, WORKSHOP, ...)
  top?: string // first line of the name, small
  word?: string // name, big (needed when the name is in Arabic)
  look?: string // key of a look (colour pair, decoration and icon)
  palette?: string // colours of another look
  decor?: string // edge decoration of another look
  icon?: string // icon key of the kit icon library
  bg?: number // WhatsApp picture background, 0 to 7
  cap?: string // caption for the post
  wa?: string // WhatsApp group link
  poster?: string // the framed 3:4 poster used in the story
  short?: string // short name for the calendar pictures (default: the name without Club or Activity)
  posts?: { t: string; to: string[] }[] // when it was posted to Instagram or Facebook, newest last
}

/* how often a club or event repeats */
export type Freq = 'weekly' | 'biweekly' | 'monthly'

export interface Club {
  id: string
  name: string
  desc: string
  days: string[]
  time: string
  room: string // a room of the space, or the place when `outside` is on
  outside?: boolean // takes place outside the space (a park, another venue): no room is used
  lead: string
  vol: string[]
  url: string
  poster?: string
  icon?: string // key from CLUB_ICONS, rendered on calendar chips
  placeholder?: boolean
  freq?: Freq // how often the sessions repeat (default weekly)
  from?: string // ISO date the series starts (optional)
  until?: string // ISO date the series ends (optional)
  kit?: KitOverrides // Social kit settings
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
  outside?: boolean // takes place outside the space: no room is used
  lead?: string // who looks after it (a name from the people list)
  from?: string // ISO date the series starts (repeating events)
  until?: string // ISO date the series ends (repeating events)
  poster?: string
  icon?: string // key from CLUB_ICONS, rendered on calendar chips
  kit?: KitOverrides // Social kit settings
}

export interface Volunteer {
  id: string
  name: string
  role: string
  phone: string
  aso: string
  email: string
}

export type LibBand = 'Kids' | 'Teens' | 'Adults'

export interface LibraryFolder {
  id: string
  name: string
  desc: string
  url: string
  sk: string[] // ['L','S','R','W'] - only the skills the folder really trains
  cat?: string // group key from LIB_GROUPS
  bands?: LibBand[] // age bands the material suits (missing = all)
}

export interface Note {
  week: number
  text: string
}

/* one person at ASO; they can hold several roles (a teacher who also volunteers, a coordinator who is also an intern) */
export interface TeamMember {
  id: string
  name: string
  roles?: string[] // Coordinator, Administrator, Teacher, Intern, Volunteer, or a custom one
  role?: string // older entries: one free-text role, read through rolesOf()
  looksAfter?: string[] // classes (code), clubs (name) and events (title) they look after, picked from what exists
  duty?: string // other responsibilities, free text
  phone: string
  email: string
  aso?: string // ASO number
}

/* something that does not run as usual for a few days or weeks: a teacher who is away (their classes),
   a club, or an event. It is cancelled, or (classes and clubs) covered by someone else. */
export interface Absence {
  id: string
  kind?: 'teacher' | 'club' | 'event' // missing = teacher (older entries)
  teacher: string // kind teacher: who is away
  classId?: string // kind teacher: empty = every class of that teacher
  clubId?: string // kind club
  eventId?: string // kind event
  from: string // ISO date, inclusive
  to: string // ISO date, inclusive
  reason: string // Sick, Away, ...
  cover?: string // substitute teacher; empty = the class is cancelled
  note?: string
  /* kind club or event: not cancelled, only held somewhere else (or at another time) on these dates */
  moved?: { place: string; outside?: boolean; time?: string }
}

export interface ChangeEntry {
  t: string // ISO time
  text: string // "Public Speaking Club: time changed from 2:00 PM - 4:00 PM to 3:00 PM - 5:00 PM"
}

export interface State {
  v: 1
  _rev: number
  _updated?: string // ISO time of the last change, shown to the director
  _changes?: ChangeEntry[] // what the latest saves changed on the calendar, newest first
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
  absences?: Absence[]
  _filtered?: boolean // a cut-down copy sent to visitors; never saved back
  rootUrl?: string
}

/* ---- view routing (single-page app) ---- */
export type View =
  | 'landing'
  | 'director'
  | 'dashboard'
  | 'home'
  | 'eltaso'
  | 'level-detail'
  | 'clubs'
  | 'resources'
  | 'intern-public'
  | 'interns-events'
  | 'interns-clubs'
  | 'interns-rooms'
  | 'interns-report'
  | 'teacher-rooms'
  | 'login'
  | 'settings'
  | 'intern'
  | 'classes'
  | 'team'
  | 'rooms'
  | 'absences'
  | 'library'
  | 'reports'
  | 'intern-clubs'
  | 'intern-events'
  | 'social'

export type Side = 'elt' | 'intern'

export type ClubViewMode = 'list' | 'grid'
export type CalendarViewMode = 'grid' | 'list'
