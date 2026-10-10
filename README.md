# ASO Companion

The ASO Companion web app - American Space Oujda, 2026-2027.
One app, two sides:

- **ELTASO - Classes**: English programs, weekly plans, classes, library, reports (admin & teachers)
- **Internship - Clubs & Events**: Lead Intern space, clubs, events, volunteers, reports

This repository is a **static site**: no build step, no dependencies.
Any static host serves it as-is (GitHub Pages, Vercel "Other", Netlify).

## Use it

- Open the site and you are straight in the **teacher view** - no code needed
  (calendar, weekly plans, classes, library, reports, clubs & events calendar).
- Admin and the lead intern sign in at **/login**
  (`https://justkhalid.github.io/aso-companion/login`) or via **Admin sign in** in the menu.
- Default codes: admin `1234` (also the lead intern code) - **change them** in Settings -> Access the first time you sign in.
- Data is saved **per device** in the browser (localStorage) by default. To share
  edits across devices, turn on **Cloud sync** (see below) - it commits your
  state to a file in the GitHub repo.
- Installable as an app (Chrome/Edge: install icon in the address bar).

## Cloud sync (save to GitHub) - v2.10

Because the site is a static page (no backend), edits live in your browser only
by default. Cloud sync lets the admin commit the current state to a JSON file in
the GitHub repo so that other devices can pull it.

In **Settings -> Cloud sync (GitHub)**:

- **GitHub repository**: `owner/name` (default: `justkhalid/aso-companion`).
- **Branch**: commits go to this branch (default: `main`).
- **File path**: where the state JSON lives in the repo (default: `data/state.json`).
- **Personal Access Token**: a fine-grained PAT with `Contents: Read and write`
  permission on this repo. Stored only in this browser's localStorage.
- **Auto-save on every edit** (toggle): commits to GitHub ~3s after each change.
- **Auto-load on page open** (toggle): replaces local state with the GitHub
  file on boot. Useful when multiple people edit - everyone stays in sync.
- **Save now** / **Load now**: manual one-shot buttons.

The PAT is stripped from the JSON before it is committed (GitHub's secret
scanner would reject the commit otherwise), so the token never leaves the
browser of the admin who entered it.

**Security**: anyone with browser access to the admin's device can read the
PAT from localStorage. Use a fine-grained PAT scoped to only this repo, and
sign out (top of the sidebar) when you are done on a shared computer.

## Admin sign-in and `ASO_SESSION_SECRET`

The admin code is checked on the server (`POST /api/login`), which sets a signed
HttpOnly session cookie. Saving (`POST /api/sync`) requires that cookie and
returns 401 without it. Public visitors still read everything through
`GET /api/state`, but `adminCode` and `teacherCode` are removed from their copy.

Set `ASO_SESSION_SECRET` (a long random string, e.g. `openssl rand -hex 32`) in
Vercel or `.env.local` to sign the cookie. Without it the app derives a key from
`BLOB_READ_WRITE_TOKEN` / `GITHUB_PAT`, or uses a fixed development key outside
production. If the code was ever public (it is in the repo's `data/state.json`
history), change it in Settings after deploying.

## Library

The Library page groups the Drive folders by what a teacher needs, filters by age and
skill, shows a "most used" shelf for each age band (taken from the Teacher kits), lets
you browse subfolders and search about 21,000 file names. The folder tree and file names
come from `public/library-index.json`, a snapshot of the Drive that is only downloaded
when someone browses subfolders or searches.

Rebuild it whenever the Drive changes (the folders must be shared with "anyone with the link"):

```bash
python3 maintenance/build_library_index.py              # 5 folder levels deep
python3 maintenance/build_library_index.py --max-depth 6
```

Group, age bands and skill tags for each folder are edited in **Library -> Edit folder**.
The Drive itself is never changed by the app.

## Caching

`/api/state` sends an `ETag` built from the state revision. Browsers revalidate on every
load and get a tiny `304 Not Modified` when nothing changed, instead of downloading the
whole state again. The server also keeps the last read in memory for 15 seconds so a burst
of visitors does not hit GitHub or Blob each time. Public images are cached for a day.

## Export buttons (PNG, Excel, Word)

- The **Clubs & Events** PNG export includes **both clubs and weekly recurring
  events** in the same grid (gold chips with a calendar icon for events).
- One-time events (with a specific date) are not in the weekly grid - they only
  appear in the upcoming-events list on the calendar page.
- After rendering, the PNG opens in a **preview sheet** so you can see it
  immediately. Click **Download** to save it, or **Open in new tab** to view it
  full-size. On iPhone/iPad the Download button opens the iOS share sheet
  (Save Image / Save to Files); if the share sheet is dismissed you'll see
  "Share cancelled - tap Export PNG again to retry".

## Club cards (v2.10)

- The **Clubs** list (`/intern/clubs` for the admin/intern, and the public
  `/calendar` page below the weekly grid) now shows clubs as **cards** in a
  responsive grid - full poster on top, name + description + days/time/room +
  lead + volunteers below. Admin/intern cards also show Edit and Delete buttons.
- On the public `/calendar` page, the cards appear **below** the weekly
  timetable grid, so visitors can see the full poster and details for every
  club in one scroll.

## Structure

- `index.html`, `style.css`, `js/01..07*.js` - the whole app (vanilla JS, no framework)
- `icons/`, `manifest.webmanifest` - PWA install support
- `DEPLOY_STEPS.md` - how to put this on GitHub Pages and Vercel
