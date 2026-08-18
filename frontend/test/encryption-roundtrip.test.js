import { describe, it, expect, beforeEach } from 'vitest';

const PIN = '4242';
const TEACHER_ID = 'teacher-1';
const TEACHER_NAME = 'Ms. Rivera';

// Tests in this file do 250k-iteration PBKDF2 + AES-GCM in Node's webcrypto.
// That's slow enough on CI to need a generous per-test budget.
const ENC_TIMEOUT = 60000;

const makeLocalStorage = () => {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
};

// Stub the Web Crypto API so the sync-blob helpers (which use crypto.subtle)
// work in the node test environment. The local-storage helpers in store.js
// use crypto-js and only need crypto.getRandomValues, which Node 18+ exposes.
const ensureCrypto = () => {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    const { webcrypto } = require('node:crypto');
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
};

// Mirrors store.js's private getDateKey() (local-midnight normalized, then
// toISOString().slice(0,10)) so date keys built here line up with what
// migrateLegacyAttendance/deriveCurrentAttendance recompute internally,
// regardless of the host timezone.
const getAppDateKey = (date = new Date()) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().slice(0, 10);
};

describe('FE-8 client-side encryption round-trip', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    global.sessionStorage = makeLocalStorage();
    if (typeof globalThis.btoa === 'undefined') {
      globalThis.btoa = (input) => Buffer.from(String(input), 'binary').toString('base64');
    }
    if (typeof globalThis.atob === 'undefined') {
      globalThis.atob = (input) => Buffer.from(String(input), 'base64').toString('binary');
    }
    ensureCrypto();
  });

  const seedPin = async (pin) => {
    const { setupSecurityPin } = await import('../src/store.js');
    setupSecurityPin(pin);
  };

  it('writes an encrypted envelope to localStorage and round-trips state losslessly through saveStore/getStore', async () => {
    await seedPin(PIN);

    const { saveStore, getStore } = await import('../src/store.js');

    const todayKey = getAppDateKey();
    const original = {
      teacherId: TEACHER_ID,
      teacherName: TEACHER_NAME,
      classes: [{ name: 'Grade 5 — Sampaguita', isAdvisory: true }],
      currentClass: 'Grade 5 — Sampaguita',
      students: [
        { name: 'Maria Santos', class: 'Grade 5 — Sampaguita' },
        { name: 'Dante Pascual', class: 'Grade 5 — Sampaguita' }
      ],
      attendanceLog: {
        'Maria Santos': { '2026-08-10': 'A', '2026-08-12': 'A', [todayKey]: 'A' },
        'Dante Pascual': { '2026-08-11': 'P', [todayKey]: 'P' }
      },
      attState: { 'Maria Santos': 'A', 'Dante Pascual': 'P' },
      workflows: [{ id: 'wf-1', student: 'Maria Santos', stage: 'monitoring', updatedAt: 1724000000000 }],
      behaviorLogs: [{ id: 'b-1', student: 'Dante Pascual', tag: 'Quiet', timestamp: 1724000000000 }],
      careInteractions: [],
      syncMeta: { attState: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    };

    saveStore(original);

    const raw = localStorage.getItem('educare_local_state');
    expect(raw).toMatch(/^enc:local:v1:/);
    // The encrypted blob must not contain any student PII in plaintext.
    expect(raw).not.toContain('Maria Santos');
    expect(raw).not.toContain('Dante Pascual');
    expect(raw).not.toContain('Grade 5 — Sampaguita');

    // Sanity-check that the in-memory session PIN and the verifier are both
    // set before we depend on getStore() doing the decrypt.
    const { hasSessionPin, hasSecurityPinConfigured } = await import('../src/store.js');
    expect(hasSessionPin()).toBe(true);
    expect(hasSecurityPinConfigured()).toBe(true);

    // Surface the getStore() failure mode (it catches the decrypt error and
    // logs via console.error) so a regression here doesn't hide silently.
    const origError = console.error;
    let lastError = null;
    console.error = (...args) => { lastError = args; };

    const loaded = getStore();
    console.error = origError;
    if (lastError) {
      console.log('getStore threw (suppressed):', lastError.map(String).join(' '));
    }

    expect(loaded.teacherId).toBe(TEACHER_ID);
    expect(loaded.teacherName).toBe(TEACHER_NAME);
    expect(loaded.classes).toEqual(original.classes);
    expect(loaded.students).toEqual(original.students);
    expect(loaded.attendanceLog).toEqual(original.attendanceLog);
    expect(loaded.attState).toEqual(original.attState);
    expect(loaded.workflows).toEqual(original.workflows);
    expect(loaded.behaviorLogs).toEqual(original.behaviorLogs);
  }, ENC_TIMEOUT);

  it('does not yield the original plaintext when given the wrong PIN', async () => {
    await seedPin(PIN);

    const { saveStore, setSessionPin, getStore } = await import('../src/store.js');

    const todayKey = getAppDateKey();
    const original = {
      teacherId: 'teacher-2',
      teacherName: 'Mr. Cruz',
      students: [{ name: 'Carla Garcia', class: 'Section A' }],
      attendanceLog: { 'Carla Garcia': { [todayKey]: 'A' } },
      attState: { 'Carla Garcia': 'A' },
      classes: [],
      currentClass: '',
      workflows: [],
      behaviorLogs: [],
      careInteractions: [],
      syncMeta: { attState: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    };

    saveStore(original);
    const encryptedBlob = localStorage.getItem('educare_local_state');
    expect(encryptedBlob).toMatch(/^enc:local:v1:/);

    // Simulate a wrong-PIN unlock attempt — the app must not surface any of the
    // original state. getStore() catches the decryption failure and falls back
    // to defaultState, so we assert on the returned shape, not on a thrown error.
    setSessionPin('0000');

    const wrongPinView = getStore();
    expect(wrongPinView.students).toEqual([]);
    expect(wrongPinView.attState).toEqual({});
    expect(wrongPinView.attendanceLog).toEqual({});
    expect(wrongPinView.teacherName).not.toBe('Mr. Cruz');
  }, ENC_TIMEOUT);

  it('round-trips the sync blob envelope produced by getSyncBlob through applySyncBlob', async () => {
    const teacherId = 'teacher-sync';
    await seedPin(PIN);

    const { saveStore, getSyncBlob, applySyncBlob, getStore } = await import('../src/store.js');

    const todayKey = getAppDateKey();
    const original = {
      teacherId,
      teacherName: 'Ms. Encrypted',
      students: [{ name: 'Ana Lim', class: 'Section B' }],
      attendanceLog: { 'Ana Lim': { '2026-08-10': 'A', '2026-08-11': 'A', '2026-08-12': 'A', [todayKey]: 'A' } },
      attState: { 'Ana Lim': 'A' },
      assessments: [],
      submissions: {},

      workflows: [{ id: 'w-1', student: 'Ana Lim', stage: 'flagged', updatedAt: 1724000000000 }],
      behaviorLogs: [],
      careInteractions: [],
      classes: [],
      currentClass: '',
      syncMeta: { attState: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    };

    saveStore(original);
    const encryptedBlob = await getSyncBlob();

    expect(encryptedBlob).toMatch(/^enc:v1:/);
    expect(encryptedBlob).not.toContain('Ana Lim');
    expect(encryptedBlob).not.toContain('Ms. Encrypted');

    // Clear local state so applySyncBlob is the only source of the recovered data.
    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId,
      students: [],
      attendanceLog: {},
      attState: {},
      assessments: [],
      submissions: {},
      workflows: [],
      behaviorLogs: [],
      careInteractions: [],
      syncMeta: { attState: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    }));

    const ok = await applySyncBlob(encryptedBlob, 99);
    expect(ok).toBe(true);

    const merged = getStore();
    expect(merged.students).toEqual(original.students);
    expect(merged.attendanceLog).toEqual(original.attendanceLog);
    expect(merged.attState).toEqual(original.attState);

    expect(merged.workflows).toEqual(original.workflows);
    expect(merged.lastSyncId).toBe(99);
  }, ENC_TIMEOUT);

  it('does not clobber the encrypted blob with plaintext when saveStore runs before the PIN is unlocked', async () => {
    // Reproduces the initApp() -> loginTeacher()/registerTeacher() startup path: those
    // calls do getStore()/saveStore() to persist an updated authToken on every app
    // launch, *before* the user has entered their PIN this session.
    await seedPin(PIN);

    const { saveStore, getStore, clearSessionPin, setSessionPin } = await import('../src/store.js');

    const todayKey = getAppDateKey();
    const original = {
      teacherId: 'teacher-locked',
      teacherName: 'Ms. Locked',
      students: [{ name: 'Rica Mendoza', class: 'Section C' }],
      attendanceLog: { 'Rica Mendoza': { [todayKey]: 'P' } },
      attState: { 'Rica Mendoza': 'P' },
      classes: [],
      currentClass: '',
      workflows: [],
      behaviorLogs: [],
      careInteractions: [],
      syncMeta: { attState: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    };

    saveStore(original);
    expect(localStorage.getItem('educare_local_state')).toMatch(/^enc:local:v1:/);

    // Simulate a fresh page load: the module-level session PIN is gone, but the
    // PIN verifier (hasSecurityPinConfigured) survives in localStorage.
    clearSessionPin();

    // This is exactly what loginTeacher()/registerTeacher() do on startup.
    const lockedState = getStore();
    lockedState.authToken = 'refreshed-token';
    saveStore(lockedState);

    // The encrypted blob must still be there — not replaced by a plaintext dump
    // of the empty/default state that getStore() returns while locked.
    const raw = localStorage.getItem('educare_local_state');
    expect(raw).toMatch(/^enc:local:v1:/);

    setSessionPin(PIN);
    const unlocked = getStore();
    expect(unlocked.students).toEqual(original.students);
    expect(unlocked.attendanceLog).toEqual(original.attendanceLog);
    expect(unlocked.attState).toEqual(original.attState);
  }, ENC_TIMEOUT);

  it('resetForgottenPin wipes the unrecoverable encrypted state and lets a new PIN be set up', async () => {
    await seedPin(PIN);

    const { saveStore, getStore, resetForgottenPin, hasSecurityPinConfigured, hasSessionPin, setupSecurityPin } = await import('../src/store.js');

    const original = {
      teacherId: 'teacher-forgot',
      students: [{ name: 'Karla Dela Cruz', class: 'Section D' }],
      attendanceLog: {},
      attState: {},
      classes: [],
      currentClass: '',
      workflows: [],
      behaviorLogs: [],
      careInteractions: [],
      syncMeta: { attState: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    };
    saveStore(original);
    expect(localStorage.getItem('educare_local_state')).toMatch(/^enc:local:v1:/);

    resetForgottenPin();

    expect(localStorage.getItem('educare_local_state')).toBeNull();
    expect(hasSecurityPinConfigured()).toBe(false);
    expect(hasSessionPin()).toBe(false);

    // The teacher can set up a brand-new PIN and start a fresh roster afterward.
    setupSecurityPin('1357');
    const fresh = getStore();
    expect(fresh.students).toEqual([]);
  }, ENC_TIMEOUT);
});
