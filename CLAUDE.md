# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EduCare is a teacher-facing, offline-first mobile app that turns routine classroom data (attendance, grades, homework, participation) into automated early-warning flags and a structured student-care workflow. Full product rationale lives in [README.md](README.md); the three product pillars (Discovery/EWS, Response, Recovery) are detailed in [pillars/discovery.md](pillars/discovery.md), [pillars/response.md](pillars/response.md), and [pillars/recovery.md](pillars/recovery.md).

**Important gap to know about:** the pillars docs and README describe the target product vision (velocity-pattern detection, personal statistical baselines, cross-subject NLP correlation, zero-knowledge encrypted sync, generative check-in scripts). The current code is a much simpler MVP prototype — see "What's actually implemented" below. Don't assume advanced behavior exists just because it's described in those docs; verify against the code.

This is a monorepo with three independent, separately-versioned subprojects — there is no root `package.json`:

- `backend/` — Express + SQLite sync API
- `frontend/` — the actual EduCare app (Vite + vanilla JS, packaged to Android via Capacitor)
- `landing/` — an unrelated React marketing/pitch site deployed to GitHub Pages

## Commands

### Frontend (the app) — run from `frontend/`
```
npm install
npm run dev        # vite dev server, bound to 0.0.0.0:5173 (host: true) for testing on a phone over LAN
npm run build       # outputs to frontend/dist — this is what Capacitor packages
npm run preview
```

### Backend (sync API) — run from `backend/`
```
npm install
npm start           # node server.js — listens on process.env.PORT || 3000
```

### Landing (marketing site) — run from `landing/`
```
npm install
npm run dev
npm run lint        # eslint .
npm run build
npm run deploy       # predeploy build, then gh-pages -d dist -> razielsevilla.github.io/educare
```

### Android packaging (from `frontend/`)
```
npm run build
npx cap sync android
# then open frontend/android in Android Studio, or drive gradlew directly inside frontend/android
```

### Tests
No test suite exists in any subproject. `backend/package.json`'s `test` script is an unimplemented placeholder (`exit 1`); frontend and landing have no test tooling configured at all.

## Architecture

### The frontend is not a typical Vite SPA
Almost all of the real UI and screen logic lives as a large inline `<script>` block inside [frontend/index.html](frontend/index.html) (screen markup + navigation + per-screen render functions like `navTo()`, `openProfile()`, `careStep()`), not in `src/`. [frontend/src/app.js](frontend/src/app.js) is the one real ES module Vite builds; it imports from `store.js`/`sync.js` and then **attaches everything onto `window`** (`window.getStore`, `window.computeRisk`, `window.renderDynamicScreens`, etc.) specifically so the inline `<script>` in index.html can call into module code. When touching app behavior, expect to edit both `app.js` (data/logic) and the inline script in `index.html` (rendering/wiring) together.

`frontend/src/main.js` and `counter.js` are unused Vite scaffold leftovers from `create-vite` — not part of the real app, don't build on top of them.

### State: one localStorage blob
[frontend/src/store.js](frontend/src/store.js) is the single source of truth. `getStore()`/`saveStore()` read/write a JSON blob at `localStorage['educare_local_state']` (plus a few individual keys mirrored out for bootstrapping: teacherId, teacherName, pin, classes, currentClass). There is no other persistence layer on the client — every mutation helper (`addStudent`, `addClass`, `updateAttendance`, `moveToRecovery`, `fillMockData`, ...) follows the same read-mutate-save pattern against this blob.

### What's actually implemented (vs. the pillars vision)
`window.computeRisk()` in [frontend/src/app.js](frontend/src/app.js) is the entire "EWS engine" today: a deterministic rule check against *today's* attendance mark, average assessment score, and homework submission rate, producing a `clear|monitoring|flagged|critical` tier plus reason strings. It does not do velocity/trend analysis, personal baselines, cross-subject aggregation, or NLP — those are Discovery-pillar roadmap items, not current behavior.

Similarly, the detailed student profile and care-workflow screens (triage summary, insight cards, check-in prompts) are driven by a hardcoded `personaData` object inside index.html's inline script, with entries for exactly three named students ("Maria Santos", "Dante Pascual", "Carla Garcia"); any other student falls back to Maria Santos's persona. This is presentation-layer mock content and is independent of the real `computeRisk` tiering shown in the roster/discovery lists.

### Sync is not actually zero-knowledge yet
[backend/database.js](backend/database.js) documents `sync_blobs` as an encrypted-blob store for a "zero-knowledge architecture," but [frontend/src/sync.js](frontend/src/sync.js) currently pushes/pulls plain `JSON.stringify`'d data (`attState`, `assessScores`, `workflows`) with no client-side encryption. Sync is teacher-scoped (`teacherId`, generated via `POST /api/teacher/register`), and conflict handling is last-write-wins: `pullSync()` just applies the newest blob in full, and `applySyncBlob()` shallow-merges `attState`/`assessScores` and overwrites `workflows`. Background sync polls `pullSync()` every 10s (`startBackgroundSync` in sync.js).

`sync.js` also hardcodes a LAN IP (`PC_IP`) used as the API host when the app is opened via `localhost`/`127.0.0.1` — update this constant to match the dev machine's current LAN IP when testing on a physical device/emulator against a local backend.

### Backend
[backend/server.js](backend/server.js) is a single-file Express app with three routes: `GET /health`, `POST /api/sync/push`, `GET /api/sync/pull`, `POST /api/teacher/register`. No auth beyond passing a `teacherId`. [backend/database.js](backend/database.js) opens `backend/educare.db` (SQLite, checked into git) and creates `teachers`/`sync_blobs` tables on startup if missing; there are no migrations, just idempotent `CREATE TABLE IF NOT EXISTS`.

### Offline/PWA
[frontend/public/sw.js](frontend/public/sw.js) is a service worker registered from `app.js`: cache-first for the app shell/fonts/icons, and for any request whose port is `3000` (the backend API) it goes network-first and silently returns a stub `{status:'offline'}` response on failure so the UI can keep relying on localStorage. Capacitor handles native offline behavior separately when packaged as an Android app, so the service worker mainly matters for the installable web/PWA path.

### `landing/`
Independent React 19 + Vite app, ESLint-configured, deployed via `gh-pages` to `razielsevilla.github.io/educare`. It does not share code, state, or build tooling with `frontend/` — treat it as a separate project that happens to live in this repo.
