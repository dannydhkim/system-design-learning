# Offline app with automatic GitHub sync: design

Date: 2026-11-12. Status: built on 2026-11-13 (see "What was built" at the end); the owner's checks of the two
"decisions made without the owner" and the real-device install are still open.

## Why

Progress is saved in the browser (`localStorage`, key `sdq.state.v1`). When `serve.py` is running, it also writes
`progress/progress.json`. Moving progress between devices means running `git commit && git push` by hand, or pressing
Push/Pull in Settings → "Sync straight to GitHub". GitHub isn't failing. But version control is built for deliberate
snapshots, and the owner wants saving to work like any app: it happens on its own, works offline, and shows up on
every device.

The owner wants to study on a laptop and a phone, open the app with no connection "like a desktop exe", and have
progress sync whenever a connection is available. It's for one person only.

## Goals

1. **Installable and offline.** The app is hosted once on GitHub Pages
   (`https://dannydhkim.github.io/system-design-learning/`). The owner installs it from the browser on laptop and phone
   ("Install" / "Add to Home Screen"). After that it opens from its own icon with no network and works fully, including
   question decks, labs, rigs, and boss fights.
2. **Saves are always local first.** Every save goes to the device immediately, exactly as today. The network is never
   on the path of a save.
3. **Automatic sync through GitHub.** The online copy is one file, `progress.json`, in a new **private** repo
   (default `dannydhkim/system-design-progress`, branch `main`). The app reads and writes it through the GitHub
   Contents API, which the app already uses. The owner never runs git for progress.
4. **Nothing is ever lost or overwritten.** Concurrent edits from two devices are merged with the existing
   `SD.merge` in `js/core.js`, never last-write-wins at the file level.
5. **The owner can tell what's going on.** A small indicator shows the sync state, and Settings shows details.

## Non-goals

- Multiple users, accounts, or sign-in. A per-device token is the only credential.
- Real-time sync, meaning seeing another device's answers within seconds. Within a few minutes is enough.
- Any new service: Cloudflare, Supabase, Firebase, or a server of our own.
- Native or app-store builds (Electron, Tauri, iOS/Android).
- Encrypting the progress file. The repo is private, and that's sufficient.

## Anti-goals (a failure even if it "works")

- Any path where progress made on one device is silently dropped, or a newer remote copy is overwritten by an older one.
- The token ending up in the progress file, the code repo, or any log or toast.
- The app breaking, stalling, or nagging when offline or when no token is set. Without a token it behaves exactly as
  it does today.
- Sync commits landing in the public code repo, or progress becoming publicly readable.
- Adding a build step, npm runtime dependency, or external CDN. The app stays plain files served as-is.

## Constraints and facts about the current code

- No build step. `index.html` loads about 20 scripts in order (`js/data/*.js`, `js/vendor/breakscale-sim.js`,
  `js/core.js` … `js/app.js`), plus `css/style.css` and two decks fetched at runtime (`questions/*.json`, in
  `SD.initContent`, core.js ~line 502). There are no external assets. Total is about 1.5 MB.
- State, normalize, merge, and persistence live in `js/core.js` (~lines 108–320):
  - `SD.save()` sets `updatedAt`, writes `localStorage`, and queues a POST to `serve.py` (`pushToServer`, with backoff).
  - `merge(a, b)` is a commutative merge that keeps the max of totals, the union of sets, the newer card review, and
    so on. It honors `resetAt`: a deliberate reset or import discards older copies instead of merging them.
  - `reconcile(other)` folds a copy into `SD.state` and writes back whichever side lacks something. This is the hook
    the new sync should use.
  - `SD.load()` merges `localStorage` with `progress/progress.json` if served.
- The manual GitHub sync is in `js/app.js` (~lines 285–340). It defines `GHKEY = 'sdq.github'`, kept out of the
  progress file on purpose, plus `ghCall`, `SD.github.push/pull`, and the Settings card. Today's pull calls
  `SD.replaceState`, which replaces instead of merging.
- The code repo is **public**. GitHub Pages is configured from `main` at `/`, and `.nojekyll` exists. The Pages API
  currently reports status `errored`, and the latest build has been stuck in `building` since 2026-11-11. That needs a
  look as part of this work.
- `progress/` is **untracked** in git. The old Settings "Push to GitHub" button writes to the public repo through
  the API, not through git, so the remote was checked separately: on 2026-11-12,
  `GET /repos/dannydhkim/system-design-learning/contents/progress` returned 404. No progress has been published.
  Keep it that way.
- Existing checks live in `tools/check-*.mjs` (node, no deps). New logic should get a check in the same style.

## Design

### 1. Install and offline (PWA)

- Add `manifest.webmanifest` with name, short name, `start_url: "./"`, `scope: "./"`, `display: "standalone"`,
  theme/background colors from `css/style.css`, and PNG icons at 192 and 512 px, plus a maskable one. Install
  prompts need PNG icons; the current favicon is an inline SVG "◈". Link the manifest from `index.html` and add
  `apple-touch-icon` and `theme-color` meta tags.
- Add a service worker, `sw.js` at the repo root so its scope covers the app:
  - On install, precache every file the app needs: `index.html`, `css/style.css`, every script in `index.html`, both
    `questions/*.json`, the manifest, and the icons.
  - Serve same-origin GETs from the cache. Never intercept `api.github.com` or `api/progress`.
  - Updates: the cache name carries a version. When a new version is deployed, the next online launch installs it in
    the background, and the app shows a toast ("New version ready — Reload"). Old caches are deleted on activate. The
    app must never be stuck on an old version with no way forward, and must never force-reload in the middle of a
    quiz or boss fight.
- The precache list must not drift from `index.html`. Add `tools/check-sw.mjs`, which fails if any local
  script, stylesheet, or fetched deck isn't in the list, or if the list names a missing file.
- Call `navigator.storage.persist()` once, so the browser is less likely to evict local progress. This matters most on
  iOS.
- Running from `serve.py` (localhost) should keep working. Registering the service worker there is fine, but it
  must not make local development painful. The builder decides how, for example a network-first fetch on localhost.

### 2. Automatic sync

A new module (my call: `js/sync.js`, loaded after `core.js`) replaces the manual Push/Pull. It reuses `ghCall`-style
Contents API requests and moves that code out of `app.js`.

**Config** stays in `localStorage['sdq.github']`, never in the progress file: `owner` (default `dannydhkim`), `repo`
(default `system-design-progress`), `branch` (default `main`), `path` (default `progress.json`), `token`. If an old
config still points at `system-design-learning` / `progress/progress.json`, it's migrated to the new defaults once.
The old target would put progress in the public repo.

**Cycle** (one at a time, never two in flight):
1. `GET` the file with `cache: 'no-store'`. 404 means no remote copy yet.
2. If there's a remote copy, `normalize` it and `reconcile` it into `SD.state`. Remember its `sha`.
3. If the merged state differs from the remote copy, `PUT` it with that `sha`. Use a short commit message, such as
   "Sync from <device label>", where the device label is an optional Settings field.
4. If the `PUT` is rejected because the file changed (409, or 422 with a sha mismatch), go back to step 1 and retry
   a few times. This is what guarantees no overwrite.

**When a cycle runs:**
- At startup, after `SD.load()`.
- On the browser's `online` event.
- About 30–60 seconds after the last `SD.save()`. A longer debounce means fewer commits; the builder picks the value.
- When the page is hidden or closed, flush any pending changes on a best-effort basis (`keepalive`; progress is about
  8 KB, under the keepalive limit). Hidden-time flushes are unreliable on mobile, which is why the next startup
  always syncs.
- When the app regains focus or visibility, and every few minutes while it's open, pull so the other device's
  progress shows up.
- A "Sync now" button in Settings.

**Failure handling:**
- Offline or network error: mark as offline or waiting, and retry with backoff capped at a few minutes. Local saves
  continue as normal.
- 401 or 403: the token is bad or expired. Stop retrying and show "Sync needs a new token" in the indicator and
  Settings, without spamming toasts.
- 404 on the repo itself (not the file): show that the repo or token setup is wrong.
- Rate limiting is unlikely at this volume (5,000 requests an hour authenticated), but handle `Retry-After` or
  `x-ratelimit-reset` by waiting.

**Interaction with what exists:**
- `serve.py` saving stays as is. Both can run at once, since they're independent.
- Reset and import set `resetAt`, and `merge` keeps the copy with the larger `resetAt` whole. With sync, that means
  **a reset or import applies to every device**, including progress another device made afterwards but hadn't
  synced yet (my call; reset is rare and deliberate). To keep this from biting by accident:
  - The reset and import confirmations say they apply to all synced devices.
  - Whenever a sync is about to discard a copy because of `resetAt`, especially on a device's first sync after a
    token is added, the app asks first ("This device was reset on <date>; the online copy has more progress. Keep
    which?") instead of silently picking one.
- Multiple tabs on one device already converge through the `storage` event. Only one tab needs to sync at a time,
  but two doing it is safe thanks to the sha check. Using a lock (Web Locks API) to avoid duplicate commits is the
  builder's call.

### 2b. Totals add up across devices (owner's decision)

Today `merge` keeps the larger of each running total. That's right for two tabs, which share one history, but wrong
for two devices used offline from the same starting point. If the laptop earns 100 XP offline and the phone earns 50,
the owner wants **150** after syncing, not 100.

**Which fields are affected.** Totals that every answer adds to:
- `xp`
- `days[date]`
- `counts[k]`, which feeds badges such as `rev100`
- each topic's `right` and `wrong`

Increments happen in `core.js` around lines 363–386 (`s.xp += gain`, `s.days[today()] += gain`, `s.counts[k] += 1`)
and wherever topic tallies are bumped.

**Fields that stay as they are:**
- Bests merge by max: `hi`, `bestCombo`, `streak.best`, per-station bests in topics.
- Sets merge by union: `badges`, `done`.
- Cards keep the newer review.
- `combo`, `streak`, and daily `quests` keep their current rules. Quest progress uses max (my call): undercounting a
  daily quest after offline use on two devices is harmless.

**How it works** (a grow-only counter per device):
- Each device has a random id kept in `localStorage` outside the progress file (e.g. `sdq.device`), created on first
  run.
- The progress file holds a tally per device, for example
  `tally: { <deviceId>: { xp, days: {}, counts: {}, topics: { <id>: { right, wrong } } } }`. A device only ever adds
  to its own entry.
- `merge` combines tallies by taking, per device and per key, the max. Each device's own numbers only grow, so this
  never loses or double-counts anything. Any device's entry is kept even if that device never syncs again.
- The totals the app shows are the sum across all device entries.
- **Migration:** existing totals from before this change go into one shared entry, `legacy`, not into the device's
  own entry. `legacy` merges by max, as today. Two devices that both carry the same pre-sync history then count it
  once, not twice. New increments go to the device's own entry.
- Reset and import clear all tallies, consistent with `resetAt`.
- `normalize` validates the new shape like everything else: drop malformed entries, coerce numbers, and guard
  `__proto__` keys.

**What's left to the builder:** whether readers keep using `s.xp` and the others as derived fields recomputed after
load, merge, and every save (the least invasive option), or call accessor functions. Either way, all increments go
through one helper, and nothing writes a total directly. Existing checks (`tools/check-*.mjs`) and the HUD, stats,
level, and badge code must keep working unchanged in what they display.

### 3. What the owner sees

- **HUD indicator:** one small icon or word with states such as synced, syncing, waiting (unsynced changes), offline,
  and needs setup or new token. Tapping it opens Settings. Without a token configured, show nothing, or a subtle
  "local only".
- **Settings → "Cloud sync" card**, replacing "Sync straight to GitHub":
  - The current status and "last synced <time>".
  - Token field (password type) and optional device label. Owner, repo, branch, and path sit behind a "details"
    toggle with the defaults filled in.
  - "Sync now".
  - Short setup steps: create a private repo `system-design-progress` → create a fine-grained token with
    **Contents: read and write** on that one repo only → paste it here on each device.
  - Export/Import stay as they are, as a manual backup.
- The update toast from §1.

### 4. Hosting and docs

- Pages only serves what's committed and pushed to `main`. There's a lot of uncommitted work right now, and
  committing and pushing it is the owner's decision. The builder therefore works on a branch and verifies on
  `serve.py`/localhost (service workers are allowed on localhost). They diagnose why the Pages build is errored and
  hand over the fix, with no pushes, Pages API changes, or re-runs without the owner's go-ahead. The real-device
  install checks on the Pages URL come after the owner pushes.
- Add `progress/` to `.gitignore` so a local progress file can never be committed to the public repo.
- Update `README.md`: how to install on laptop and phone, how to set up sync (private repo + token), and that
  `serve.py` is now optional for saving.

### 5. Verification

- `tools/check-sync.mjs` (node, mocked `fetch` and a fake in-memory GitHub). It should cover two simulated devices
  editing offline and then syncing in either order, with no progress lost and both converging. That includes XP,
  daily totals, counts, and topic tallies adding up (100 + 50 = 150), and legacy totals present on both devices
  counted once. Also: syncing the same copy twice changing nothing; a stale-sha
  `PUT` triggering the merge and retry; a reset on one device beating older progress on the other; 401 stopping
  retries; and the token never appearing in any request body or saved state.
- `tools/check-sw.mjs` as in §1.
- In a browser, against the real Pages URL or `serve.py`: install, go offline (DevTools), and confirm every
  page type works. Answer questions offline, come back online, and see it sync. Open a second browser profile as
  "device 2" and confirm progress appears. Confirm a new deploy shows the update toast.

## Decisions made by the owner

- Installable web app (PWA) rather than a native exe. One build covers laptop and phone.
- GitHub stays the online store, through the API, with a separate private repo. No Cloudflare or other service.
- Single user, with no accounts.
- Running totals add up across devices (§2b).

## Decisions made without the owner (please check)

- A reset or import applies to every synced device, with a confirmation before any sync discards a copy (§2).
- Daily quest progress still merges by max, not by adding up (§2b).

- Separate module `js/sync.js` rather than growing `core.js` or `app.js`.
- The "Pull from GitHub" button, which replaced progress outright, is removed. Sync always merges, and Import still
  covers deliberate replacement.
- The debounce is somewhere in 30–60 seconds, so a study session makes tens of commits in the private repo, not
  hundreds.
- `progress/` goes into `.gitignore`.
- The old sync config pointing at the public repo is migrated automatically to the private repo defaults.

## Left to the builder

The exact debounce and backoff numbers, the service worker update mechanics, the icon artwork (keep the "◈" look),
the HUD indicator's exact look (match the existing HUD style), whether to use Web Locks, and how the service worker
behaves on localhost.

## Needs the owner (cannot be automated)

- Creating the private repo `system-design-progress` and the fine-grained token. Tokens must be created by the
  account holder.
- Committing and pushing the current work so Pages can serve it.

## What was built (2026-11-13)

Everything in §1 to §5 except the steps under "Needs the owner". Choices the spec left to the builder:

- **Totals:** `s.xp`, `s.days`, `s.counts` and each topic's `right`/`wrong` stay as fields, recomputed from the
  tallies after every load and merge. All increments go through `gain`, `count` and `tallyHit` in `js/core.js`.
- **Sync timing:** 45 seconds after the last save, and at most 3 minutes after the first unsynced one; every 5
  minutes while open; on coming back to the app if the last sync is over 30 seconds old. Retries start at 15 seconds
  and double up to 5 minutes.
- **Web Locks** are used where the browser has them, so one tab syncs at a time.
- **Reset question:** shown in Settings with the sync indicator turned to "needs a decision", not as a pop-up. A
  device is asked when the copy about to be dropped has progress and either (a) this device's reset was never
  confirmed with sync on, or (b) this device has progress it never synced. A device whose progress was all synced
  accepts another device's reset without asking.
- **Service worker version:** a fingerprint of the files, written by `node tools/check-sw.mjs --write`. On localhost
  the service worker fetches from the network first.
- **Added beyond the spec:** sync checks that the repository is private before the first write of a session and
  refuses a public one; it also refuses to overwrite a file that is not a progress file.

Not verified: sync against the real GitHub API (it needs the owner's token; the checks use a stand-in with the same
status codes), installing on a real phone, and the hosted Pages copy.

**Pages:** the last two builds from `main` (2026-11-11, runs 3 and 4) ended in `startup_failure`: GitHub never
started a job, so the site's files are not the cause (the same commit built from another branch two hours earlier).
The cause is not visible from the API. Things to check: Settings → Pages (source branch), Settings → Actions (that
Actions are allowed), and the account's billing page for an Actions notice; then re-run the failed run.
