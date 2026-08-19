# EduCare — Improvement Tickets

This file tracks concrete, verified issues found during a full codebase assessment (see conversation history / commit `946e057` era) and defines a ticket per issue with acceptance criteria that must all be true before the ticket can be closed. Tickets are grouped by subproject: **Backend**, **Frontend**, **Landing**.

Priority scale: **P0** (data/security integrity, blocks trustworthy use) · **P1** (core feature is non-functional or misleading) · **P2** (code health / maintainability) · **P3** (polish).

---

## Backend Tickets (`backend/`)

### BE-1 — Add real authentication to the sync API
**Priority:** P0
**Found in:** [server.js:21-49](backend/server.js#L21), [server.js:52-65](backend/server.js#L52)
**Problem:** `/api/sync/push`, `/api/sync/pull`, and `/api/teacher/register` accept any request that supplies a bare `teacherId` UUID. There is no secret, password, or token check — anyone who obtains or guesses a teacherId can read or overwrite that teacher's synced student data.
**Acceptance Criteria:**
- [x] Teacher registration requires a credential (passphrase/PIN/password) in addition to a name, and the credential is stored server-side using a proper hash (bcrypt/argon2), never plaintext.
- [x] `push`/`pull` require a valid session token or signed credential tied to `teacherId`; requests without it return `401`.
- [x] A request presenting a mismatched or invalid credential for a given `teacherId` returns `403` and is rejected before touching the database.
- [x] Existing rows in `teachers`/`sync_blobs` have a documented migration path (new nullable auth columns + backfill script or reset instructions) so the change doesn't silently orphan current data.
- [x] Automated test (see BE-6) covers: register → push with valid token succeeds; push with wrong/missing token is rejected; pull only returns the requesting teacher's own data.

### BE-2 — Implement real client-side encryption for sync blobs (true zero-knowledge)
**Priority:** P0
**Found in:** [database.js:21-23](backend/database.js#L21) (comment claims "zero-knowledge" encrypted blobs), [sync.js:36-46](frontend/src/sync.js#L36) (sends plain `JSON.stringify`), no crypto dependency in either `package.json`.
**Problem:** The backend is documented as storing only encrypted, opaque blobs, but no encryption exists anywhere in the stack. Student attendance/scores/workflow data currently travels and is stored as plaintext JSON.
**Acceptance Criteria:**
- [x] `blobData` received by `/api/sync/push` is verified (e.g. via a format/length check or an explicit "encrypted envelope" schema) to be ciphertext, not raw JSON — the server must not be able to trivially deserialize it as plaintext.
- [x] The server has no key material capable of decrypting the blob (key lives client-side only, e.g. derived from the teacher's PIN/passphrase via a KDF).
- [x] `backend/educare.db`'s `sync_blobs.blobData` column, when inspected directly, contains no readable student names, scores, or notes.
- [x] Decryption round-trips correctly on the client that produced it (push then pull then decrypt reproduces the original state) — covered by a test.
- [x] README/docs are updated to describe the encryption scheme actually implemented (algorithm, key derivation, what "zero-knowledge" means here) so the claim is accurate going forward.

### BE-3 — Harden CORS and add rate limiting
**Priority:** P1
**Found in:** [server.js:12](backend/server.js#L12) (`app.use(cors())` with no options — allows any origin)
**Problem:** Any website can call this API cross-origin, and there is no throttling on registration or sync endpoints, making spam/abuse (fake teacher accounts, blob-push flooding) trivial.
**Acceptance Criteria:**
- [x] `cors()` is configured with an explicit allow-list (dev origins + the real app origin(s)), not the open-all-origins default.
- [x] `/api/teacher/register` is rate-limited per IP (e.g. via `express-rate-limit`) with a documented threshold, and exceeding it returns `429`.
- [x] `/api/sync/push` and `/api/sync/pull` are similarly rate-limited per teacherId/IP.
- [x] Basic security headers are set (e.g. via `helmet`).
- [x] A test confirms requests beyond the configured limit are rejected.

### BE-4 — Stop committing the SQLite database binary to git
**Priority:** P1
**Found in:** `backend/educare.db` tracked and modified across commits (e.g. `946e057 chore(db): update local sqlite database state`, `aa72989 chore: add sqlite database file`)
**Problem:** A binary database file is checked into version control and routinely updated as a "chore" commit. This bakes local/dev data permanently into history, produces unreviewable binary diffs, and will conflict destructively the moment two people touch the repo at once.
**Acceptance Criteria:**
- [x] `backend/educare.db` is removed from git tracking and added to `.gitignore` (repo history rewrite is out of scope unless explicitly requested — just stop future commits).
- [x] A documented bootstrap step (e.g. `npm run db:init` or the existing `CREATE TABLE IF NOT EXISTS` logic running on first `npm start`) recreates an empty schema for any fresh clone.
- [x] README/CLAUDE.md is updated to state the DB file is local-only and git-ignored.
- [x] If seed/demo data is still needed for development, it's provided as a checked-in SQL/JS seed script, not a binary snapshot.

### BE-5 — Add request validation on all endpoints
**Priority:** P1
**Found in:** [server.js:22-24](backend/server.js#L22), [server.js:39-41](backend/server.js#L39), [server.js:54-56](backend/server.js#L54) — validation is limited to a single falsy-check per field.
**Problem:** There's no type/shape/length validation on request bodies or query params — e.g. `blobData` could be any type, `teacherId` isn't checked to be a UUID, `since` isn't checked to be numeric.
**Acceptance Criteria:**
- [x] A schema validation library (e.g. `zod`) defines the expected shape for every route's input.
- [x] Malformed input (wrong type, missing required field, invalid UUID format, non-numeric `since`) returns `400` with a descriptive error before any DB call.
- [x] Existing valid requests continue to succeed unchanged (regression-tested).

### BE-6 — Add an automated backend test suite
**Priority:** P2
**Found in:** [package.json:8](backend/package.json#L8) — `"test": "echo \"Error: no test specified\" && exit 1"`
**Problem:** There are no tests. `npm test` is a stub that always fails.
**Acceptance Criteria:**
- [x] A test runner (e.g. `vitest` or `jest` + `supertest`) is installed and `npm test` runs it.
- [x] Integration tests exist for all four routes (`/health`, `/api/sync/push`, `/api/sync/pull`, `/api/teacher/register`) covering both success and validation-failure paths.
- [x] Tests run against an isolated/in-memory SQLite DB, not `backend/educare.db`.
- [x] `npm test` exits `0` on a clean run and is safe to wire into CI.

### BE-7 — Replace blind last-write-wins sync with a real merge/versioning strategy
**Priority:** P2
**Found in:** [sync.js:56-75](frontend/src/sync.js#L56) (`pullSync` applies only the single latest blob), [store.js:137-150](frontend/src/store.js#L137) (`applySyncBlob` shallow-merges two fields and outright overwrites `workflows`)
**Problem:** Two devices syncing the same teacher's data will silently clobber each other's changes — there is no per-field merge, no timestamp comparison, no conflict surfacing to the user. This will actively lose data as soon as more than one device is used, which the product's own "Future Directions" (multi-teacher sync) assumes will happen.
**Acceptance Criteria:**
- [x] Sync payloads carry enough metadata (per-record timestamps or a version vector) to merge concurrent edits at the field/record level, not just take-the-latest-whole-blob.
- [x] `workflows` entries are merged/deduped by student+id rather than replaced wholesale.
- [x] A documented, tested scenario exists: two "devices" push different changes to different students between the same two sync cycles, and both changes survive after both devices pull.
- [x] Any genuine conflict (same field, same record, edited on both sides) is either resolved by an explicit deterministic rule (documented) or surfaced to the user rather than silently dropped.

---

## Frontend Tickets (`frontend/`)

### FE-1 — Redesign attendance/state storage to be time-series, not single-flag
**Priority:** P0
**Found in:** [store.js:44-52](frontend/src/store.js#L44) — `attState[student] = status` has no date key at all.
**Problem:** Only the single most recent attendance mark per student is ever retained. Every rolling-window/velocity claim in the product docs (e.g. "3 absences in a 2-week window") is currently impossible to compute because no history is stored.
**Acceptance Criteria:**
- [x] Attendance is stored per student **per date** (e.g. `attendanceLog[student][date] = status`), with `attState`-style "today's mark" derivable from it, not the source of truth.
- [x] A one-time migration converts any existing single-flag `attState` into the new structure (mapped to today's date) so current users don't lose their in-progress day's marks.
- [x] `getAttendance`/`updateAttendance` (and all call sites in `app.js`/`index.html`) are updated to the new shape; roll-call UI ([index.html:3841](frontend/index.html#L3841)) continues to work unchanged from the teacher's perspective.
- [x] A query helper exists to fetch "attendance records for student X in the last N days," proven by a unit test with seeded multi-date data.
- [x] Sync blob format (`getSyncBlob`/`applySyncBlob` in `store.js`, BE-7) is updated to carry the new structure without breaking merge logic.

### FE-2 — Implement real rolling-window / velocity detection in the risk engine
**Priority:** P0 (depends on FE-1)
**Found in:** [app.js:16-81](frontend/src/app.js#L16) — `computeRisk` only reads today's single attendance flag.
**Problem:** The EWS engine markets pattern/velocity detection (README "Example flag triggers") but only checks the current day's snapshot.
**Acceptance Criteria:**
- [x] `computeRisk` (or a successor function) flags a student when 3+ absences occur within any rolling 14-day window, using the FE-1 time-series data.
- [x] A "scattered vs. clustered" distinction exists per `pillars/discovery.md` intent (e.g. same-weekday absences vs. isolated illness-like clustering) — at minimum implemented as a documented heuristic, not aspirational text.
- [x] Each triggered reason string states the actual window/count that caused it (e.g. `"3 absences in the last 14 days"`), not a hardcoded phrase.
- [x] Unit tests cover: no flag under threshold, flag exactly at threshold, flag correctly scoped to the rolling window (an absence 20 days ago must not count toward a 14-day window).
- [x] Existing roster/dashboard rendering in `app.js`/`index.html` consumes the new reasons without further changes to the UI layer.

### FE-3 — Implement personal baseline + standard-deviation grade tracking
**Priority:** P1 (depends on FE-2 patterns)
**Found in:** [app.js:62-68](frontend/src/app.js#L62) — flat `<75`/`<85` thresholds regardless of the student's own history.
**Problem:** The docs describe detecting an A-student suddenly scoring C's (baseline anomaly); the code only checks an absolute cutoff, so a consistently high performer and a consistently low performer are judged by the same bar, and a sudden real drop for a strong student isn't specially flagged.
**Acceptance Criteria:**
- [x] Each student's average and standard deviation are computed from their own historical assessment scores.
- [x] A flag fires when a recent score deviates beyond a documented number of standard deviations from that student's own baseline, independent of the absolute score.
- [x] The flat absolute thresholds are kept only as a fallback for students with insufficient history to establish a baseline (documented minimum sample size).
- [x] Unit tests cover: a high-baseline student dropping to a "passing" score that's still anomalous for them gets flagged; a chronically low-scoring student who is stable does not get flagged for the same absolute score.

### FE-4 — Persist behavioral/participation tags and feed them into risk computation
**Priority:** P1
**Found in:** [index.html:4232-4236](frontend/index.html#L4232) — `logBehavior(tag)` only shows a toast and navigates; nothing is written to the store.
**Problem:** One-tap behavior tagging is listed as an MVP feature but the tag is discarded immediately after the toast disappears.
**Acceptance Criteria:**
- [x] `logBehavior(tag)` writes `{ student, tag, timestamp }` into the store (new `behaviorLogs` collection) and calls `syncLocalStateToBackend`.
- [x] `computeRisk`/its successor reads recent behavior logs and factors incident/passive/withdrawn tags into tier and reasons (per `pillars/discovery.md`'s intent), with the specific rule documented.
- [x] The student profile screen displays actual logged behavior history for that student, not just the hardcoded persona content (see FE-6).
- [x] A unit test confirms a logged "Incident" tag changes a student's computed tier.

### FE-5 — Implement a real Care Interaction Log and follow-up scheduler
**Priority:** P1
**Found in:** [index.html:4171-4181](frontend/index.html#L4171) — `completeCarework()` shows the literal hardcoded string `"Follow-up set for Jun 23"` and never records the action taken, notes, or the `outcomeSelected` value.
**Problem:** The core "close the loop" step of the Care Workflow — the thing that supposedly prevents students from falling through the cracks — records nothing.
**Acceptance Criteria:**
- [x] Completing a care workflow persists a record containing: student, action taken, outcome selected (improving/unchanged/worsening), any notes entered, and a real computed timestamp.
- [x] The follow-up date is computed (e.g. "+7 days" or a configurable interval) using the actual current date, not a hardcoded string, and is stored on the workflow record.
- [x] On or after the follow-up date, the student is resurfaced to the teacher (e.g. in a "Follow-ups due" list) with the prior interaction's context visible.
- [x] The student's profile/history view shows a chronological log of past care interactions and outcomes, not just the current stage.
- [x] A unit test confirms a follow-up dated today-or-earlier appears in a "due" query and one dated in the future does not.

### FE-6 — Replace hardcoded 3-student `personaData` with data-driven profile content
**Priority:** P1
**Found in:** [index.html:3251-3373](frontend/index.html#L3251) — persona data exists for exactly "Maria Santos," "Dante Pascual," and "Carla Garcia"; every other student falls back to Maria Santos's fabricated case.
**Problem:** Every student besides three specific demo names sees someone else's completely unrelated case history and quotes on their own profile — a correctness bug, not just a content gap.
**Acceptance Criteria:**
- [x] Profile insight cards, triage summaries, and check-in prompt sections are generated from the real `reasons`/tier data computed for that specific student (from FE-2/FE-3/FE-4), not a lookup keyed on a fixed name list.
- [x] No student is ever shown another student's data. Verified by a test that opens a profile for an arbitrary/unknown student name and asserts the rendered content only references that student's own computed signals.
- [x] Any remaining example/sample copy for demo purposes is clearly separated behind a "demo mode" flag rather than being the silent default fallback for real data.

### FE-7 — Make the PIN lock meaningful or stop presenting it as a security feature
**Priority:** P0
**Found in:** [index.html:3574](frontend/index.html#L3574) — `pinVal === (localStorage.getItem('educare_pin') || '1234')`, checked entirely client-side.
**Problem:** The PIN is a client-side string comparison with a hardcoded fallback ('1234'), trivially bypassed via devtools or by reading localStorage directly, and it guards data that already sits unencrypted in the same localStorage. It provides no real protection while README markets it as securing student data.
**Acceptance Criteria:**
- [x] The `'1234'` hardcoded fallback is removed; PIN setup is mandatory during onboarding with no default.
- [x] The underlying student data (FE-8) is encrypted at rest using a key derived from the PIN/passphrase, so the PIN gate is backed by something a devtools inspection can't trivially bypass.
- [x] Repeated wrong-PIN attempts are throttled (e.g. increasing delay or lockout after N attempts).
- [x] On Android builds, the app offers real biometric authentication via a Capacitor biometrics plugin as an alternative to PIN, matching the README's "PIN or biometric" claim.
- [x] README's security claims are re-verified against the implementation and corrected if any part still doesn't match.

### FE-8 — Encrypt data at rest and in transit on the client
**Priority:** P0 (pairs with BE-2)
**Found in:** No crypto dependency in `frontend/package.json`; `store.js` reads/writes plain JSON to `localStorage`; `sync.js` sends plain JSON over HTTP.
**Problem:** All student PII (names, scores, attendance, behavior notes) sits in plaintext in browser localStorage and travels in plaintext over the network.
**Acceptance Criteria:**
- [x] Sensitive fields (or the whole state blob) are encrypted before being written to `localStorage`, using a key derived from the teacher's PIN/passphrase via a proper KDF (e.g. PBKDF2/Argon2 via a maintained library).
- [x] Data cannot be read in plaintext by inspecting `localStorage` in devtools without the correct PIN/passphrase.
- [x] `getSyncBlob`/`pushSync` encrypt before sending; `applySyncBlob`/`pullSync` decrypt after receiving (integrates with BE-2).
- [x] Losing/forgetting the PIN has a documented, explicit recovery story (e.g. accepted data loss with clear warning, or a recovery key shown once at setup) rather than silent undefined behavior.
- [x] A test confirms round-trip encrypt→store→load→decrypt produces identical data.

### FE-9: Fix stored-XSS via unescaped student/class names
**Context**: The application directly interpolates user-provided text (like student names or class names) into HTML strings, including directly into `onclick="..."` attributes. This allows a malicious user (or compromised sync payload) to execute arbitrary JavaScript.
**Acceptance Criteria**:
- [x] A global HTML sanitization function (`escapeHtml`) is implemented.
- [x] `innerHTML` templates that display user data wrap those interpolations in the sanitize function.
- [x] `onclick`-with-interpolated-string patterns are replaced with event listeners bound in JS (passing the value via closure/dataset) so no user string is ever embedded inside an HTML attribute as a JS literal.
- [x] A regression test adds a student named `"><img src=x onerror=alert(1)>` and asserts no script executes and the name renders as literal text in the roster.

### FE-10 — Remove dead code and unused/duplicated state
**Priority:** P2
**Found in:** [app.js:10-11](frontend/src/app.js#L10) (`fillMockData`/`clearLocalState` exported but called from nowhere in `index.html`), [store.js:127-134](frontend/src/store.js#L127) (`assessScores` defined and synced but never populated or read — superseded by `submissions`), `frontend/src/main.js`/`counter.js` (unused `create-vite` scaffold).
**Problem:** Accumulated cruft from past refactors makes the codebase harder to reason about and increases the chance of editing something that has no effect.
**Acceptance Criteria:**
- [x] Decision made and implemented for `fillMockData`/`clearLocalState`: either wire real "Populate demo data"/"Reset local state" buttons into a settings screen, or delete the functions and their exports entirely.
- [x] `assessScores` is either removed from `defaultState`/`getSyncBlob`/`applySyncBlob`, or actually used consistently in place of/alongside `submissions` — not both defined and dead.
- [x] `frontend/src/main.js` and `frontend/src/counter.js` (and their unused imports/assets like the Vite/JS logos) are deleted, and `index.html`'s script tag references only real entry points.
- [x] A search for `window\.` exports in `app.js` confirms every exported function is called from at least one place in `index.html`, or is explicitly documented as a public API surface used only outside the repo.

### FE-11 — Make the backend host configurable instead of a hardcoded LAN IP
**Priority:** P2
**Found in:** [sync.js:4](frontend/src/sync.js#L4) — `const PC_IP = '192.168.100.32';`
**Problem:** The API base URL for LAN/mobile testing is hardcoded to one developer's machine IP, breaking for anyone else and requiring a source edit every time the network changes.
**Acceptance Criteria:**
- [x] The backend host is configurable via a build-time env var (Vite `.env`) or a runtime settings-screen field, with the current hardcoded value removed from source.
- [x] A sensible default/documented fallback exists for local development (e.g. reading from `import.meta.env`).
- [x] `.env.example` (or equivalent) documents the variable for new contributors.
- [x] Changing the backend host does not require editing `sync.js`.

### FE-12 — Consolidate inline `index.html` `<script>` logic into real ES modules
**Priority:** P2
**Found in:** `frontend/index.html`'s ~2000-line inline `<script>` block (screens, navigation, care/attendance/assessment logic) duplicating/bypassing `frontend/src/app.js`, e.g. [index.html:3245-3246](frontend/index.html#L3245) redefining `getStoreStudents`/`getStoreAttState` locally instead of using `window`-exported versions from `app.js`.
**Problem:** Business logic is split across two files that must be edited in lockstep, with no import boundary enforcing consistency — this has already produced drift (duplicate accessor definitions) and makes the codebase hard to navigate or safely refactor.
**Acceptance Criteria:**
- [x] All logic currently in the inline `<script>` block is moved into proper ES modules under `frontend/src/`, imported by `app.js` or a new entry module, and bundled by Vite.
- [x] `index.html` contains markup only — no embedded business logic (`<script>` blocks limited to, at most, a module import).
- [x] No function/state accessor is defined twice; a single source of truth exists for each (e.g. one `getStoreStudents`).
- [x] The app builds and behaves identically after the move (manual smoke test of navigation, attendance, assessments, care workflow, roster).

### FE-13 — Add frontend linting and a minimal unit test suite
**Priority:** P2
**Found in:** No ESLint config and no test tooling anywhere under `frontend/` (contrast with `landing/`, which has both).
**Problem:** The subproject with the most business logic in the repo has zero automated quality gates.
**Acceptance Criteria:**
- [x] An ESLint config is added to `frontend/` and `npm run lint` is added to `package.json`, passing cleanly on current code (or with explicitly justified disables).
- [x] A test runner (e.g. `vitest`) is added with `npm test` wired up.
- [x] Unit tests exist for `store.js`'s pure functions and for the risk-computation logic (`computeRisk`/its FE-2/FE-3 successor), covering at minimum the scenarios enumerated in FE-2/FE-3/FE-4's acceptance criteria.
- [x] CI (or at minimum a documented pre-commit step) runs both lint and test.

---

## Landing Tickets (`landing/`)

### LP-1 — Fix dead call-to-action links
**Priority:** P1
**Found in:** [Header.jsx:16](landing/src/components/Header.jsx#L16) (`"Try the Prototype"` → `href="#"`), [Footer.jsx:12](landing/src/components/Footer.jsx#L12) (`"Join Early Access"` → `href="#"`)
**Problem:** The two primary conversion actions on the entire marketing site go nowhere. A visitor motivated enough to click either button lands back on the same scroll position with no feedback.
**Acceptance Criteria:**
- [x] "Try the Prototype" links to an actual reachable destination (hosted prototype build, app store listing, or a clearly-labeled "coming soon" state) — not `#`. *(Now opens a "coming soon" modal instead of a dead `#` anchor.)*
- [x] "Join Early Access" either links to a real signup mechanism (form, mailto, external waitlist tool) or is replaced with accurate copy if no signup flow exists yet. *(No signup mechanism exists yet — replaced with a static "Early Access — Coming Soon" label, no longer a link.)*
- [x] No anchor tag on the page has a bare `href="#"` used as a placeholder for an unbuilt action (logo-to-top is fine; a fake CTA is not).
- [ ] Clicking either button produces a visible outcome (navigation, modal, or confirmation), verified manually in a browser. *(Verified via build + code review only — no browser automation tool was available in this session to click-test in an actual rendered browser.)*

### LP-2 — Fix or remove dead footer links
**Priority:** P2
**Found in:** [Footer.jsx:20-21](landing/src/components/Footer.jsx#L20) — `"Technical Specifications"` and `"Privacy Protocol"` both point to `href="#"`.
**Problem:** These read as real, clickable legal/technical documents but lead nowhere — particularly bad for "Privacy Protocol" on a site collecting interest from teachers about handling student data.
**Acceptance Criteria:**
- [x] Either real pages/documents exist at these links (a technical spec page, an actual privacy policy), or the links are removed from the footer until that content exists. *("Technical Specifications" now links to the real on-page `#technical` section; "Privacy Protocol" was removed since no policy exists and no data-collection mechanism is currently live on the site.)*
- [x] If a privacy policy is published, its claims are cross-checked against FE-8/BE-2's actual implementation status rather than describing aspirational encryption. *(N/A — no privacy policy was published.)*

### LP-3 — Correct false security/capability claims in the Technical section
**Priority:** P0
**Found in:** [Technical.jsx:18-19](landing/src/components/Technical.jsx#L18) ("Student records stay securely encrypted on your device"), [Technical.jsx:30-31](landing/src/components/Technical.jsx#L30) ("Built-in biometric locks"), [Technical.jsx:60-64](landing/src/components/Technical.jsx#L60) (sample code implying rolling-window absence detection already runs).
**Problem:** This is public-facing marketing copy soliciting "Early Access" interest from real teachers, asserting on-device encryption, biometric locks, and working rolling-window detection — none of which exist in the current codebase (see FE-2, FE-7, FE-8). This is the most externally visible instance of the vision/reality gap found in the full assessment.

**Update:** re-verified against current code — FE-2/FE-3/FE-7/FE-8/BE-2 are now actually implemented (rolling 14-day window + personal-baseline detection in `app.js`, PIN-derived AES encryption at rest in `store.js`, Android biometric unlock via Capacitor in `app.js`), so the encryption and biometric claims are accurate today. What was still false: "Smart Term Awareness" (no quarter/grading-period logic exists anywhere) and, in `CareLoop.jsx`, "generative, context-aware check-in scripts", "historical success rate" matching, and automatic "shadow monitoring"/relapse-detection — all unimplemented aspirational claims from the pillars vision.
**Acceptance Criteria:**
- [x] Every capability claim on the landing page is verified against actual shipped code before publishing, and copy is updated to describe current state accurately (e.g. "designed to" / "roadmap" framing for unbuilt features, present tense only for what's real). *(Checked Technical.jsx and CareLoop.jsx claims against app.js/store.js; fixed "Smart Term Awareness" → "Personal Baseline Detection" and reframed CareLoop's Response/Recovery pillar copy with explicit "roadmap" framing for the generative/historical-matching/relapse-detection parts that don't exist.)*
- [x] The code-sample block either reflects logic that actually exists in the codebase or is explicitly labeled as an illustrative/conceptual example, not presented as running production logic. *(Labeled "Illustrative — simplified from the real risk engine"; tier corrected from `MONITORING` to `CRITICAL` to match the actual `computeRisk` output.)*
- [x] A lightweight process is documented (e.g. a checklist in `CLAUDE.md` or a PR template item) requiring marketing copy changes to be checked against implementation status before merge, to prevent this drift recurring. *(Added a "Marketing copy must match shipped code" note to CLAUDE.md's `landing/` section.)*

### LP-4 — Fix page metadata (title, description, social preview)
**Priority:** P3
**Found in:** [index.html:7](landing/index.html#L7) — `<title>landing</title>`, no meta description, no Open Graph/Twitter card tags.
**Problem:** The browser tab, search results, and any shared link preview all show the generic Vite scaffold title instead of branding, and there's no description for SEO or social sharing.
**Acceptance Criteria:**
- [x] `<title>` reflects the actual product name (e.g. "EduCare — Early Warning System for Student-Centered Care").
- [x] A `<meta name="description">` summarizing the product is present.
- [x] Open Graph (`og:title`, `og:description`, `og:image`) and equivalent Twitter card tags are added for link-preview rendering. *(`og:image`/`twitter:image` point at the existing `/favicon.svg` — no dedicated social-preview image exists yet; worth a follow-up if a proper PNG preview image is wanted.)*
- [x] The favicon reference (`/favicon.svg`) is confirmed to resolve to a real, on-brand icon (not the default Vite/React icon). *(Confirmed — it's the real EduCare "E" mark, not Vite scaffold.)*

### LP-5 — Enforce linting in CI/pre-commit
**Priority:** P3
**Found in:** `landing/eslint.config.js` exists and `npm run lint` is defined, but nothing in the repo runs it automatically.
**Problem:** A lint config with no enforcement mechanism will silently rot as violations accumulate.
**Acceptance Criteria:**
- [x] `npm run lint` runs clean on the current codebase (fix or justify any existing violations). *(All 9 violations were the same unused `import React from 'react'` — dead now that the app uses the automatic JSX runtime; removed from all 9 files.)*
- [x] Linting is wired into CI (or, absent CI in this repo, documented as a required pre-commit/pre-push step) so future changes are checked automatically. *(Split `.github/workflows/ci.yml` into a `frontend` job and a new `landing` job that runs `npm run lint` + `npm run build` on every push/PR to `main`.)*
