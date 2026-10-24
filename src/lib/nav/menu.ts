import type { ComponentType } from 'react'
import type { View } from '@/lib/types'
import {
  LayoutDashboard,
  CalendarRange,
  Sparkles,
  CalendarClock,
  Send,
  PenLine,
  Clock,
  CalendarDays,
  School,
  GraduationCap,
  FolderOpen,
  ClipboardCheck,
  FileText,
  BookUser,
  Boxes,
  Users,
  UserX,
  Files,
} from 'lucide-react'

/**
 * The admin menu, as data.
 *
 * Everything the sidebar shows lives here, once. Before, the same destination was
 * described in five places: this list, `pageTitle()`, `ADMIN_PATH`, `computeView()` and
 * `PageBody`. They had already drifted (the menu said "Submissions", the page title said
 * "Report submissions"; the menu said "Calendar", the title said "Home").
 *
 * Nothing in this file touches React or the store: `filterNav`, `isActive` and `titleFor`
 * are pure, so they can be unit-tested without rendering anything.
 */

export type NavRole = 'admin' | 'teacher' | 'intern'

/** the tabs of the Social media page; a menu entry may point at one of them */
export type SocialTab = 'todo' | 'club' | 'event' | 'post' | 'month' | 'scheduled' | 'connection'

/** the two faces of the dashboard */
export type HomeTab = 'overview' | 'calendar'

export type BadgeKey = 'posts.toPost'

export interface NavItem {
  /** stable and never shown: the React key, the badge lookup and the title lookup all use it */
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** the screen this opens */
  view: View
  /** for the Social media page: which tab to open */
  socialTab?: SocialTab
  /** for the dashboard: which face to show */
  homeTab?: HomeTab
  /** extra views that also count as "we are here" (level-detail keeps Levels and plans lit) */
  also?: View[]
  /** who may see it. Today the whole admin shell is admin-only, so every item lists admin;
   *  when the teachers' menu lands, add 'teacher' to the ones they may open and nothing
   *  else has to change. */
  roles: NavRole[]
  /** a count to show next to the label, supplied by useNavBadges() */
  badgeKey?: BadgeKey
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

export interface NavSession {
  roles: NavRole[]
  pubView: boolean
}

/** where the reader is right now, for isActive() and titleFor() */
export interface NavCurrent {
  view: View
  socialTab: SocialTab
  homeTab: HomeTab
}

const ADMIN: NavRole[] = ['admin']

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    label: 'Home',
    items: [
      { id: 'home.overview', label: 'Home', icon: LayoutDashboard, view: 'dashboard', homeTab: 'overview', roles: ADMIN },
      { id: 'home.calendar', label: 'Calendar', icon: CalendarRange, view: 'dashboard', homeTab: 'calendar', roles: ADMIN },
    ],
  },
  {
    id: 'clubs',
    label: 'Clubs and events',
    items: [
      { id: 'clubs.all', label: 'Clubs', icon: Sparkles, view: 'intern-clubs', roles: ADMIN },
      { id: 'events.all', label: 'Events', icon: CalendarClock, view: 'intern-events', roles: ADMIN },
    ],
  },
  {
    id: 'social',
    label: 'Social media',
    items: [
      { id: 'social.todo', label: 'Share', icon: Send, view: 'social', socialTab: 'todo', roles: ADMIN, badgeKey: 'posts.toPost' },
      { id: 'social.post', label: 'New post', icon: PenLine, view: 'social', socialTab: 'post', roles: ADMIN },
      { id: 'social.scheduled', label: 'Scheduled', icon: Clock, view: 'social', socialTab: 'scheduled', roles: ADMIN },
      { id: 'social.month', label: 'Month calendar', icon: CalendarDays, view: 'social', socialTab: 'month', roles: ADMIN },
    ],
  },
  {
    id: 'teaching',
    label: 'Classes and teaching',
    items: [
      { id: 'teaching.classes', label: 'Classes', icon: School, view: 'classes', roles: ADMIN },
      { id: 'teaching.levels', label: 'Levels and plans', icon: GraduationCap, view: 'eltaso', also: ['level-detail'], roles: ADMIN },
      { id: 'teaching.library', label: 'Teaching resources', icon: FolderOpen, view: 'library', roles: ADMIN },
      { id: 'teaching.submissions', label: 'Submissions', icon: ClipboardCheck, view: 'submissions', roles: ADMIN },
      { id: 'teaching.reports', label: 'Reporting guide', icon: FileText, view: 'reports', roles: ADMIN },
    ],
  },
  {
    id: 'space',
    label: 'Space',
    items: [
      { id: 'space.members', label: 'Members', icon: BookUser, view: 'members', roles: ADMIN },
      { id: 'space.inventory', label: 'Inventory', icon: Boxes, view: 'inventory', roles: ADMIN },
      { id: 'space.documents', label: 'Documents', icon: Files, view: 'documents', roles: ADMIN },
      { id: 'space.people', label: 'People', icon: Users, view: 'team', roles: ADMIN },
      { id: 'space.absences', label: 'Absences', icon: UserX, view: 'absences', roles: ADMIN },
    ],
  },
]

/** flat list, in menu order */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

/** Not every screen is a menu entry: the sign-in, the settings, the public tabs and the
 *  week schedule still need a title. Keep them here instead of resurrecting a switch. */
const EXTRA_TITLES: Partial<Record<View, string>> = {
  home: 'Week schedule',
  clubs: 'Calendar',
  resources: 'Resources',
  login: 'Sign in',
  settings: 'Settings',
  intern: 'Home',
  rooms: 'Rooms',
  landing: 'ASO Companion',
}

const SOCIAL_TITLES: Record<SocialTab, string> = {
  todo: 'Share',
  club: 'Clubs',
  event: 'Events',
  post: 'New post',
  month: 'Month calendar',
  scheduled: 'Scheduled',
  connection: 'Connection',
}

/**
 * Drops what the session may not see, then drops groups that end up empty.
 * Pure: no store, no React, no window.
 */
export function filterNav(groups: NavGroup[], session: NavSession): NavGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => it.roles.some((r) => session.roles.includes(r))),
    }))
    .filter((g) => g.items.length > 0)
}

/** The one place that decides "is this entry the current one?" */
export function isActive(item: NavItem, current: NavCurrent): boolean {
  if (item.view === 'dashboard' && item.homeTab) return current.view === 'dashboard' && current.homeTab === item.homeTab
  if (item.socialTab) return current.view === 'social' && current.socialTab === item.socialTab
  return current.view === item.view || (item.also?.includes(current.view) ?? false)
}

/**
 * The title for the top bar, taken from the menu entry itself, so the heading and the lit
 * menu item can never say different things again.
 */
export function titleFor(current: NavCurrent, levelLabel?: string): string {
  if (current.view === 'dashboard') return current.homeTab === 'calendar' ? 'Calendar' : 'Home'
  if (current.view === 'social') return SOCIAL_TITLES[current.socialTab] ?? 'Social media'
  if (current.view === 'level-detail') return levelLabel || 'Level'
  const item = NAV_ITEMS.find((it) => it.view === current.view)
  if (item) return item.label
  return EXTRA_TITLES[current.view] ?? 'ASO Companion'
}
