# Deploy steps - put the ASO Companion online

Repository: `https://github.com/justkhalid/aso-companion`

## Option A - GitHub Pages (no command line, ~2 minutes)

1. Open `https://github.com/justkhalid/aso-companion`.
2. If the repository already has files: **Add file -> Upload files**.
3. Open the unzipped `aso-companion` folder, press `Ctrl+A`, and drag **everything
   inside it** (the files and folders, NOT the folder itself) into the upload area.
4. Write `ASO Companion site` as the commit message and click **Commit changes**.
5. Go to **Settings -> Pages**.
   - Source: **Deploy from a branch**
   - Branch: `main`, folder: **/ (root)**
   - Click **Save**.
6. Wait one or two minutes. The site is live at:
   **https://justkhalid.github.io/aso-companion/**

## Option B - Vercel (free, custom domain ready)

1. Go to `https://vercel.com` -> **Continue with GitHub**.
2. **Add New... -> Project** -> import `justkhalid/aso-companion`.
3. Framework Preset: **Other**. Leave everything else as proposed. Click **Deploy**.
4. The site is live at `aso-companion-<name>.vercel.app`.

## Updating later

- Browser: on GitHub, open the file, click the pencil icon, edit, commit - or upload
  again with **Add file -> Upload files** (same names overwrite). Pages and Vercel
  redeploy automatically.

## Data notes (important)

- Website data lives **per device, per address** in the browser. The GitHub Pages
  copy and the Vercel copy have **separate** storages. Pick ONE main address for the team.
- To move or share data: **Settings -> export backup** on the old device, send the
  `.json` file, **Settings -> import backup** on the new one.
