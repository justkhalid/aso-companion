# Handoff: ASO club kit generator -> admin menu of aso-companion

Owner: Khalid Chellali (@americanspaceoujda, Business Instagram linked to the ASO Facebook Page). Writing style: direct, no em dashes, no filler. He writes his own captions.

## Goal
Move the standalone generator (handoff/generator, runs by opening index.html) into the admin menu of this app, linked to the existing clubs/events data. Non-technical people must be able to run it after he leaves. Everything visual (chips, swatches, icon grid), minimal typing.

## What exists (handoff/generator)
- app_core.js: canvas engine. makeStory(p, theme) 1080x1920 and makeCover(p, theme) 1080x1080 (WhatsApp group picture, shown round). Fonts: Bodoni Moda italic 500/600 (titles), Manrope 500/700 (text), Cairo 700 (Arabic kicker).
- decor.js: edge decorations (film, rings, atoms, stripes, triangles, brain, books, leaves) as SVG strings, and LOOKS (colour pair c1->c2, ink, decor, default icon) per club.
- app_ui.js: Clubs / Events lists (read from this repo's state.json), Create/edit form, Settings. Companion fields (name, days, time, room, freq, dates) are read-only in the generator; overrides (look, icon, decor, bg, caption, wa link, framed poster) are saved per club id. Name split: last word big, rest small line above; "A: B" splits at the colon; Arabic titles need an English override (OV_NAMES).
- publish.js: Meta Graph API posting from the browser (Facebook photo upload unpublished -> hosted URL -> Instagram container -> media_publish; stories via media_type=STORIES and photo_stories). Untested against live Meta.
- assets.js: base64 backgrounds, fonts, logo, icons (27 library + 7 club icons, SVG on a 24 grid, stroke 0.9, accent paths filled), 6 framed posters, a snapshot of clubs/events.

## Design rules decided with the user
- Palette base: pearl ground, navy (14,26,74) to red (214,34,43); each club has its own colour pair, decoration and icon (see LOOKS).
- Posters arrive already framed (waves, footer, crest). The generator never adds a frame. Frame: hairline, location pin + AMERICAN SPACE OUJDA, IG and FB icons + @americanspaceoujda, crest top-left.
- Club story geometry: crest at y165 h78; kicker 25px tracking 7; title Bodoni italic (word max 175px/800 wide, tracking -6; first line max 92px/740, tracking -2); 520px gradient rule; day 42px bold tracking 8; time | venue 30px; poster slot x199 y857 681x906, radius 44, gradient ring hugging the poster (an earlier mismatched radius left ring slivers at the corners, fixed); pill "WHATSAPP GROUP LINK HERE" y1792 600x84.
- Event story: same but kicker fixed at y318, day 40px tracking 7, no pill, small icon at y1838.
- WhatsApp cover: crest y95 h62, icon 570px centred y455, kicker 27px, title max 86px, rule under title.
- Library hours 9-17 Mon-Fri; clubs/events may run to 6 PM. Semester start dates are never shown. Stories give recurrence ("EVERY SATURDAY"), not dates. Dislikes boxed card designs in stories.
- Instagram sizes: stories/highlight covers 1080x1920, posters 3:4 1080x1440 (Instagram API feed may reject 3:4; offer a 4:5 fallback), WhatsApp covers 1080x1080.

## Integration plan
1. Add an Admin > Social kit section: Clubs, Events, Create/edit, using the app's own state instead of fetching raw GitHub. Keep the generator's pickers.
2. Store framed posters in data/posters (already public via /api/poster) and per-item generator overrides in state.json (e.g. club.kit = {look, icon, decor, bg, cap}).
3. Posting: move to a server route (e.g. /api/social/publish) using Vercel env vars for the Page ID, Instagram ID and a long-lived token. Posters already have public URLs, so image_url can point at them; story images need uploading (blob/GitHub). Tokens last about 60 days, so add a renewal reminder and a Test connection button. Keep a confirm step before posting.
4. Meta setup is not done yet: app in Development mode with the owner as an app role avoids app review for own-account posting; the user still has to create the app and supply IDs and token.
5. Handover: add a second admin on the Facebook Page and the Meta app; document renewal in DEPLOY.md.

## Known gaps
Cybersecurity and Free Course have no dedicated decor (plain looks used); Football/Travel/Theatre icons are weak; event layout for Arabic titles uses an English override; posting untested; phone use needs the app hosted (it is).

## Reference material in this branch
- handoff/reference/images: current approved outputs (club stories with and without poster, WhatsApp covers, event stories, poster frames, highlight covers, icon library, kit overview, profile). Match these.
- handoff/reference/scripts: the Python (PIL, cairosvg) scripts that produced the kit. clubs_themed.py (club stories, THEMES colour/decor table), covers.py (WhatsApp covers), events.py (event stories), stories2.py (title layout helpers), icon_library.py (icons). They are reference only; they need fonts and helper files from the author's machine, so do not try to run them. The JS in handoff/generator already reproduces the club story, event story and WhatsApp cover.
- The author's laptop folder (not available to you): ASO-Instagram-Kit with 1-Profile, 2-Highlights (covers, title-cards, this-month, links, clubs, events, english classes, visit us), 3-WhatsApp-Group-Covers, 4-Posters (posters, club stories with posters, frames), 5-Bilingual-Stories, 6-Previews, 7-Generator.
- Not covered by the generator: highlight covers, This Month calendar stories, bilingual stories, English classes stories, Visit us stories, profile picture. Those are one-off artwork; see the images and scripts.
