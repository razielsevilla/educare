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
The backend includes automated tests: run `npm test` from `backend/` to execute the test suite (auth, encryption, rate limiting). Frontend and landing have no test tooling configured yet.

## Architecture

### The frontend is not a typical Vite SPA
Almost all of the real UI and screen logic lives as a large inline `<script>` block inside [frontend/index.html](frontend/index.html) (screen markup + navigation + per-screen render functions like `navTo()`, `openProfile()`, `careStep()`), not in `src/`. [frontend/src/app.js](frontend/src/app.js) is the one real ES module Vite builds; it imports from `store.js`/`sync.js` and then **attaches everything onto `window`** (`window.getStore`, `window.computeRisk`, `window.renderDynamicScreens`, etc.) specifically so the inline `<script>` in index.html can call into module code. When touching app behavior, expect to edit both `app.js` (data/logic) and the inline script in `index.html` (rendering/wiring) together.

`frontend/src/main.js` and `counter.js` are unused Vite scaffold leftovers from `create-vite` — not part of the real app, don't build on top of them.

### State: one localStorage blob
[frontend/src/store.js](frontend/src/store.js) is the single source of truth. `getStore()`/`saveStore()` read/write a JSON blob at `localStorage['educare_local_state']` (plus a few individual keys mirrored out for bootstrapping: teacherId, teacherName, pin, classes, currentClass). There is no other persistence layer on the client — every mutation helper (`addStudent`, `addClass`, `updateAttendance`, `moveToRecovery`, `fillMockData`, ...) follows the same read-mutate-save pattern against this blob.

### What's actually implemented (vs. the pillars vision)
`window.computeRisk()` in [frontend/src/app.js](frontend/src/app.js) is the entire "EWS engine" today: a deterministic rule check against *today's* attendance mark, average assessment score, and homework submission rate, producing a `clear|monitoring|flagged|critical` tier plus reason strings. It does not do velocity/trend analysis, personal baselines, cross-subject aggregation, or NLP — those are Discovery-pillar roadmap items, not current behavior.

Similarly, the detailed student profile and care-workflow screens (triage summary, insight cards, check-in prompts) are driven by a hardcoded `personaData` object inside index.html's inline script, with entries for exactly three named students ("Maria Santos", "Dante Pascual", "Carla Garcia"); any other student falls back to Maria Santos's persona. This is presentation-layer mock content and is independent of the real `computeRisk` tiering shown in the roster/discovery lists.

### Sync (Encrypted Zero-Knowledge Architecture)

[frontend/src/sync.js](frontend/src/sync.js) implements teacher-scoped sync with encrypted payloads. The backend accepts only encrypted blobs (format: `enc:v1:...`) and stores them opaquely in `sync_blobs.blobData` — the server has no key material to decrypt them. Client-side crypto lives in [frontend/src/crypto.js](frontend/src/crypto.js), using AES-GCM+PBKDF2 with a key derived from the teacher's **PIN** (`state.pin`, set during onboarding) — this is a different secret from the one used to authenticate to the backend, see below.

**Two distinct secrets, on purpose:** the teacher's PIN encrypts data locally and is never sent over the network. Talking to the sync API requires a separate per-device credential, generated once via `getOrCreateAuthPassword()` in [store.js](frontend/src/store.js) and stored under `educare_auth_password` — it's an opaque device credential, not something the teacher types in. `initApp()` in [app.js](frontend/src/app.js) uses it to register a new `teacherId` on first run, or to call `POST /api/teacher/login` to refresh the session token on subsequent runs (tokens expire after 7 days); if login fails against a device the backend doesn't recognize (e.g. a reset dev database), it falls back to registering a fresh account rather than syncing failing silently.

Conflict handling merges concurrent edits per-field: `applySyncBlob()`/`mergeSyncState()` in `store.js` compare a per-key `updatedAt` (tracked in `state.syncMeta`) so two devices editing different students/workflows both survive, and only a genuine same-key conflict falls back to newest-wins. Workflow entries are deduped by id.

`sync.js` hardcodes a LAN IP (`PC_IP`) used as the API host when the app is opened via `localhost`/`127.0.0.1` — update this constant to match the dev machine's current LAN IP when testing on a physical device/emulator against a local backend. (See **FE-11** for making this configurable.)

### Backend
[backend/server.js](backend/server.js) is a single-file Express app implementing JWT-authenticated sync endpoints (`register` + `login`) with encrypted blob storage, rate limiting, and CORS controls. [backend/database.js](backend/database.js) opens a local SQLite database (`backend/educare.db`, **not checked into git**) and creates `teachers`/`sync_blobs` tables on first run using idempotent `CREATE TABLE IF NOT EXISTS` statements.

**Secrets:** `JWT_SECRET` has no hardcoded fallback — if unset, the server generates a random one at process startup (logged as a warning) so tokens don't survive a restart. Set a stable value via `.env` for anything long-running; see [.env.example](backend/.env.example). Never reintroduce a fixed default secret in source — anyone reading the repo could forge tokens for any teacherId.

**Database bootstrap:** The database file is auto-created on first `npm start`. Fresh clones and new developer machines will automatically initialize an empty schema. The `.db` files are git-ignored (`backend/educare.db`, `backend/*.db`) so no developer's local state leaks into version control. For testing, the test suite uses in-memory SQLite (`EDUCARE_DB_PATH=':memory:'`). Note that two backend test files (`test/encryption.test.js`, and the frontend-focused `test/merge-sync.test.js`) import directly from `frontend/src/`, so `backend/`'s test suite isn't fully isolated from frontend source layout changes.

### Offline/PWA
[frontend/public/sw.js](frontend/public/sw.js) is a service worker registered from `app.js`: cache-first for the app shell/fonts/icons, and for any request whose port is `3000` (the backend API) it goes network-first and silently returns a stub `{status:'offline'}` response on failure so the UI can keep relying on localStorage. Capacitor handles native offline behavior separately when packaged as an Android app, so the service worker mainly matters for the installable web/PWA path.

### `landing/`
Independent React 19 + Vite app, ESLint-configured, deployed via `gh-pages` to `razielsevilla.github.io/educare`. It does not share code, state, or build tooling with `frontend/` — treat it as a separate project that happens to live in this repo.
