# ASO Companion - Next.js 16 rewrite: work record

Task ID: aso-companion-rewrite
Agent: Z.ai Code (single agent build)

## Summary
A complete rewrite of the ASO Companion web app (American Space Oujda) as a
Next.js 16 single-page application. Everything renders inside the `/` route
via client-side view switching. The app boots by fetching the cloud state from
`raw.githubusercontent.com/justkhalid/aso-companion/main/data/state.json`,
falls back to a seeded sample state offline, and syncs edits to localStorage
(and optionally GitHub via the Contents API).

## Architecture
- **Single route**: `src/app/page.tsx` renders `<AppShell />`, which switches
  views through a Zustand store `view` state. No other routes.
- **State**: Zustand store (`src/lib/store.ts`) holds the app `State`, auth
  (`admin`, `pubView`), routing (`view`, `side`, `selectedLevelKey`), boot
  status, toasts, and actions (`patch`, `setSettings`, `bootApp`,
  `loadFromCloud`, `saveToCloud`, `exportBackup`, `importBackup`, `resetAll`).
- **Boot**: `bootApp()` loads localStorage first (instant), then fetches the
  cloud state and keeps the higher `_rev`. A branded splash (logo + spinner)
  shows during loading.
- **Theme**: `next-themes` drives dark/light; a `ThemeSync` component keeps
  `settings.theme` and next-themes in sync so reloads do not flash.

## Files created
- `src/lib/types.ts` - all TS types
- `src/lib/constants.ts` - DAYS, SKILLS, LIB_CATEGORIES, LP stage times,
  REPORT_STEPS / REPORT_EXAMPLE / REPORT_SYSTEM_URL, cloud URL, LS keys
- `src/lib/seed.ts` - minimal seed state (9 levels w/ sample weeks + LPs,
  classes, clubs, events, team, volunteers, library, notes)
- `src/lib/app-utils.ts` - date math, `termStatus`, `weekMonday`, `parseSlot`
  (hour-row grouping), `toneClassForLevel` / `toneClassForClub`,
  `nextOccurrence`, `fmtEventWhen`, `initials`, `uid`
- `src/lib/store.ts` - Zustand store + boot/cloud sync
- `src/lib/export-png.ts` - html-to-image PNG export helper
- `src/components/logo.tsx`, `theme-provider.tsx`, `theme-toggle.tsx`,
  `boot-splash.tsx`, `app-toaster.tsx`, `ui-bits.tsx`, `weekly-grid.tsx`,
  `public-nav.tsx`, `admin-sidebar.tsx` (+ `AdminTopbar`), `app-shell.tsx`
- `src/components/forms/form-controls.tsx` - DayPills, TimeRangeInput (24h),
  SkillPicker
- `src/components/dialogs/` - class, club, event, volunteer, team, library,
  level, week (+ inline LessonPlan editor), lesson-plan
- `src/components/pages/` - home, eltaso, level-detail, clubs, resources,
  login, settings, classes, team, library, reports, intern-overview,
  intern-clubs, intern-events, intern-volunteers
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
  (iOS-inspired design system: light #F2F2F7 / accent #0B5CE6, dark #000 /
  #1C1C1E / accent #4E8FFF, 9-tone timetable palette, skill colors)

## Verified
- Boot splash -> cloud load -> public Home (teachers calendar grid, clubs
  grid, today list) with real cloud data.
- Public nav (Home / ELTASO / Clubs & events / Resources) + dark mode toggle
  + burger menu; admin link lives in the public footer.
- ELTASO level cards grouped by band; Level detail with semester toggle,
  week rows, skill chips, expandable week details, lesson plan dialog
  (staged 2h/90min table, game bank, differentiation, homework, tip,
  assessment checklist).
- Clubs & events weekly grid + club cards (170px poster left, content right,
  Learn more expand) + gold event cards.
- Resources: library grouped by 10 categories with skill tags + reporting
  guide (steps, field-by-field, example).
- Login: centered card, direct password, remember-me, public-view link.
- Admin chrome: left sidebar (levels, classes, clubs, team, library,
  reports) + topbar (title + week chip + theme toggle + ELT/Intern switch);
  mobile drawer.
- Settings: appearance, profile, academic year, special-week notes, access
  code, GitHub cloud sync (repo/branch/path/PAT/auto-save/auto-load/Save
  now/Load now), data export/import/reset.
- Intern side: overview dashboard, clubs, events, volunteers lists with
  add/edit/delete dialogs.
- Dark mode toggles and persists across reload (no flash).
- ESLint: 0 errors in `src/`. TypeScript: 0 errors in `src/`.

## Notes
- All UI chrome text uses regular dashes / colons (no em-dashes); cloud
  data descriptions are rendered verbatim.
- All times are 24h; events starting in the same hour share a grid row.
- Export PNG uses the `html-to-image` package.
