# ASO Companion design cleanup - work record

## Task
Implement 8 design adjustments to the ASO Companion Next.js app:
1. Replace placeholder logos with `/aso-logo.png`
2. Redesign the weekly calendar/timetable grid with fixed hour rows
3. Bring back the PNG export preview sheet
4. Change font from Geist Sans to Inter
5. Fix navigation centering in public nav
6. Remove the loading boot splash
7. Make sure all buttons work (verified via code inspection)
8. Clean up the design (rounding, em-dashes)

## Files modified

### Logo
- `src/components/logo.tsx` - rewrote `Logo` to render `/aso-logo.png` via `<img>` tag with explicit width/height for crisp scaling. Kept `Wordmark` text component unchanged.

### Layout / font
- `src/app/layout.tsx` - swapped `Geist`/`Geist_Mono` imports for `Inter` (with `display: "swap"`) + `JetBrains_Mono`. CSS variable names (`--font-geist-sans`, `--font-geist-mono`) kept identical so globals.css keeps working. Added `font-sans` to body class so Tailwind's `font-sans` resolves to Inter via the `--font-sans: var(--font-geist-sans)` mapping in globals.css.
- `src/app/globals.css` - lowered `--radius` from `0.75rem` to `0.375rem` so default shadcn rounding is 6px, not 12px.

### Boot splash removed
- `src/components/app-shell.tsx` - removed `BootSplash` import + the `if (boot === 'idle' || boot === 'loading')` branch. The app now renders its content immediately using seed/local state while `bootApp()` still fetches the cloud state in the background.
- `src/components/boot-splash.tsx` - file deleted (no longer referenced).
- The store's `bootApp` action is unchanged - it still updates `state` and `boot` in the background; the `_rev` comparison logic still picks the newer state when cloud arrives.

### Weekly grid redesigned
- `src/components/weekly-grid.tsx` - full rewrite. New approach:
  - Parse `HH:MM-HH:MM` slots into start/end minutes
  - Compute the hour span: floor the earliest start to the hour, ceil the latest end to the hour
  - Build fixed hour rows (`hours: number[]`) from `startHour` to `endHour`
  - An item overlaps an hour row when `[startMin, endMin)` intersects `[h*60, (h+1)*60)`
  - An item is rendered only on its *start* row; `minHeight` is set to `calc(56px * span - 8px)` so the block visually stretches across its spanned rows
  - This fixes the overlapping time slot issue: a 15:00-17:00 club spans 2 rows (15:00 and 16:00), a 15:00-17:30 club spans 3 rows (15:00, 16:00, 17:00)
  - The hour label column is 64px, the 7 day columns share the rest
  - Minimal 3px rounded corners on the colored blocks, subtle 1px borders using `--tone-line` per tone
  - Removed heavy `shadow-sm` and large padding for a cleaner timetable look

### PNG export preview sheet (new)
- `src/lib/export-png.ts` - new helpers: `renderNodePng(node)` returns a data URL; `downloadDataUrl(url, name)` triggers a download; `openDataUrlInNewTab(url)` opens the image in a new tab via a Blob URL (so long data URLs are not truncated). `exportNodePng(node, name)` is now `renderNodePng` + `downloadDataUrl`.
- `src/components/png-preview-sheet.tsx` - new file. `PngPreviewSheet` is a right-side Sheet that shows the generated image with Download + Open-in-new-tab buttons and a "Rendering image..." spinner state. `usePngPreview()` hook returns `{ state, busy, preview, setOpen }` - `preview(node, filename)` opens the sheet immediately with a loading state, then renders the PNG via dynamic import and shows it.
- `src/components/pages/home-page.tsx` - replaced direct `exportNodePng` calls in the "Teachers calendar" export with `png.preview(gridRef, 'teachers-calendar.png')`, added `<PngPreviewSheet>` at the bottom of the page. Same pattern for the Clubs grid (uses `clubGridRef`).
- `src/components/pages/clubs-page.tsx` - same pattern; the Clubs page now has its own `usePngPreview` + sheet. Removed the unused `exportNodePng` import.

### Public nav centering
- `src/components/public-nav.tsx` - rewrote the header layout to use `grid grid-cols-[1fr_auto_1fr]` so the logo sits in the left column, the nav is centered in the middle column via `justify-self-center`, and the actions sit in the right column. Removed the `mx-auto` hack that didn't actually center the nav. Mobile burger menu unchanged, just `rounded-full` pill changed to `rounded-md` and `hover:bg-secondary` retained.

### Login page cleanup
- `src/components/pages/login-page.tsx` - `rounded-2xl` on the card → `rounded-md`, removed `boot splash`-style decoration. Text "American Space Oujda - admin sign in" → "American Space Oujda · admin sign in".

### Admin sidebar cleanup
- `src/components/admin-sidebar.tsx` - all `rounded-lg`/`rounded-xl` → `rounded-md` for nav items, side switcher, etc. The top bar week chip text "Winter break - S2 in ${st.daysTo} days" → "Winter break · S2 in ${st.daysTo} days".

### Em-dash removal (text content)
- Replaced literal " - " with " · " in user-visible strings across many files:
  - `src/components/app-shell.tsx` (footer, public preview)
  - `src/components/pages/home-page.tsx` (term status card, today section, upcoming events)
  - `src/components/pages/eltaso-page.tsx` (subtitle, weekly plans, "This week · W{n}")
  - `src/components/pages/level-detail-page.tsx` (breadcrumb, weekly plan card, semester chips)
  - `src/components/pages/clubs-page.tsx` (subtitle, club meta line, sessions count)
  - `src/components/pages/resources-page.tsx` (filter pills, library folder chips, report steps, report form fields)
  - `src/components/pages/library-page.tsx` (subtitle, library folder chips)
  - `src/components/pages/classes-page.tsx` (subtitle, days join)
  - `src/components/pages/team-page.tsx` (subtitle)
  - `src/components/pages/intern-overview.tsx` (subtitle, upcoming events time/place)
  - `src/components/pages/reports-page.tsx` (all field labels and the example title)
  - `src/components/dialogs/lesson-plan-dialog.tsx` (dialog titles, stage "Also try:" list, generated lesson plan text)
  - `src/components/dialogs/week-dialog.tsx` (dialog title, skill labels, lesson plan toggle label)
  - `src/lib/constants.ts` (REPORT_STEPS descriptions, REPORT_EXAMPLE Topic line)
  - `src/app/layout.tsx` (metadata title)
- Code-level dashes inside arithmetic / sort comparators (e.g. `a.mins - b.mins`, `(st.week || 1) - 1`) were left intact since they are not user-visible.

### Design tokens cleanup
- `src/app/globals.css` - `--radius` lowered to 6px (`0.375rem`) so the shadcn default radii are tight:
  - `--radius-sm: calc(var(--radius) - 4px)` = 2px
  - `--radius-md: calc(var(--radius) - 2px)` = 4px
  - `--radius-lg: var(--radius)` = 6px
  - `--radius-xl: calc(var(--radius) + 4px)` = 10px

### Button/functionality verification (code inspection)
- Nav items: `setView('home'|'eltaso'|'clubs'|'resources')` in `PublicNav.go()` - all wired correctly.
- Export PNG: now calls `png.preview(ref, name)` which opens the Sheet, renders the PNG via `html-to-image`, and shows it.
- Dark mode toggle: `ThemeToggle` calls `useTheme().setTheme()` + persists to `state.settings.theme` via `setSettings` - works in light/dark/auto.
- Login: `LoginPage.attempt()` calls `store.login(code, remember)` which checks against `state.settings.adminCode` (default 1234).
- Level cards: `EltasoPage` and `AdminHomeExtra` in home-page.tsx both call `openLevel(l.key)` which sets `view: 'level-detail'` and `selectedLevelKey`.
- Lesson plan buttons: `LevelDetailPage` "Lesson plan" button calls `setLpWeek({ open: true, wi })` which opens the `LessonPlanDialog`.
- Learn more on club cards: `ClubCard` and `EventCard` have a local `open` state toggled by a button - works.
- Admin sidebar: all items call `handleNav(view, key)` which calls `openLevel(key)` for level-detail or `setView(view)` for the rest.
- Settings page: every field is wired to `setSettings((x) => { x.<field> = value })` (profile, year, access, cloud sync, special weeks notes add/remove, theme picker, toggles). Save/Load cloud buttons call `saveToCloud()`/`loadFromCloud()` from the store.
- Save/Load cloud sync: both still go through `/api/sync` (POST) and `/api/state` (GET) respectively, with fallback to direct GitHub API.

### Lint
- `bun run lint`: 0 errors, 8 warnings - all 8 warnings are in pre-existing vanilla JS files (`aso-companion/js/*.js` and `js/*.js`) which are NOT part of the Next.js source tree.
- No TypeScript or React lint errors.

### Dev log
- `curl http://localhost:3000/` returns 200.
- `/aso-logo.png` returns 200.
- `/api/state` returns 200.
- Dev log shows clean `✓ Compiled in ...` and `GET / 200 in ...` lines, no runtime errors after the fix of the `geistSans is not defined` reference (which was caused by my own intermediate state and immediately fixed by replacing the variable name in the body className).

