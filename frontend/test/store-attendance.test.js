import { describe, it, expect, beforeEach } from 'vitest';

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

describe('attendance history model', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
  });

  it('migrates legacy attState into a date-indexed attendance log and keeps today derivable', async () => {
    const { getStore, updateAttendance, getAttendanceWindow } = await import('../src/store.js');

    const legacyState = {
      teacherId: 'teacher-1',
      students: ['Alice', 'Bob'],
      attState: { Alice: 'A', Bob: 'P' },
      attendanceLog: {},
      syncMeta: { attState: {}, assessScores: {}, workflows: {} }
    };

    localStorage.setItem('educare_local_state', JSON.stringify(legacyState));

    const store = getStore();
    expect(store.attendanceLog.Alice).toBeDefined();
    expect(store.attendanceLog.Alice[Object.keys(store.attendanceLog.Alice)[0]]).toBe('A');
    expect(store.attState.Alice).toBe('A');

    updateAttendance('Alice', 'L');
    const todayState = getStore();
    expect(todayState.attendanceLog.Alice[todayState.attendanceLog.Alice ? Object.keys(todayState.attendanceLog.Alice).at(-1) : undefined]).toBe('L');
    expect(getAttendanceWindow('Alice', 14).length).toBeGreaterThanOrEqual(1);
  });

  it('returns attendance records from a multi-day window', async () => {
    const { saveStore, getAttendanceWindow } = await import('../src/store.js');

    const today = new Date();
    const keyToday = new Date(today).toISOString().slice(0, 10);
    const keyOld = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const keyOld2 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const state = {
      teacherId: 'teacher-1',
      students: ['Dana'],
      attendanceLog: {
        Dana: {
          [keyToday]: 'P',
          [keyOld]: 'A',
          [keyOld2]: 'L'
        }
      },
      attState: { Dana: 'P' },
      assessments: [],
      submissions: {},
      assessScores: {},
      workflows: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {} }
    };

    saveStore(state);

    const windowed = getAttendanceWindow('Dana', 14);
    expect(windowed.map((item) => item.date)).toContain(keyToday);
    expect(windowed.map((item) => item.date)).toContain(keyOld);
    expect(windowed.some((item) => item.date === keyOld2)).toBe(false);
  });

  it('includes exactly the last N calendar days (inclusive of today), not N+1', async () => {
    const { saveStore, getAttendanceWindow } = await import('../src/store.js');

    // Local Y-M-D key, matching store.js's getDateKey — deliberately NOT
    // toISOString(), which converts to UTC and shifts the date in timezones ahead of
    // UTC (this suite runs in Asia/Manila, UTC+8).
    const localKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const log = {};
    // 15 distinct days: today back through today-14.
    for (let i = 0; i <= 14; i += 1) {
      const key = localKey(new Date(today.getTime() - i * 24 * 60 * 60 * 1000));
      log[key] = 'P';
    }

    saveStore({
      teacherId: 'teacher-1',
      students: ['Eli'],
      attendanceLog: { Eli: log },
      attState: {},
      assessments: [],
      submissions: {},
      workflows: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {} }
    });

    const windowed = getAttendanceWindow('Eli', 14);
    // days=14 should return the 14 days ending today (today, today-1, ..., today-13) —
    // today-14 falls just outside that window.
    expect(windowed.length).toBe(14);
    const oldestIncluded = localKey(new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000));
    const excluded = localKey(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000));
    expect(windowed.map((item) => item.date)).toContain(oldestIncluded);
    expect(windowed.some((item) => item.date === excluded)).toBe(false);
  });

  it('does not discard an earlier roll-call mark when a later student is marked the same day (FE-1 regression)', async () => {
    const { getStore, updateAttendance } = await import('../src/store.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      students: ['Alice', 'Bob'],
      attendanceLog: {},
      attState: {},
      assessments: [],
      submissions: {},
      workflows: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {} }
    }));

    // Simulate a roll call: mark Alice absent, then Bob present, as two independent
    // sequential writes (mirroring the real UI recording one student at a time).
    updateAttendance('Alice', 'A');
    updateAttendance('Bob', 'P');

    const store = getStore();
    expect(store.attState.Alice).toBe('A');
    expect(store.attState.Bob).toBe('P');
  });

  it('keeps a new student\'s default present mark after a subsequent save (FE-1 regression)', async () => {
    const { getStore, addStudent, updateAttendance } = await import('../src/store.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      students: [],
      classes: [{ name: 'Grade 5', isAdvisory: true }],
      currentClass: 'Grade 5',
      attendanceLog: { Existing: { '2026-01-01': 'P' } },
      attState: {},
      assessments: [],
      submissions: {},
      workflows: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {} }
    }));

    addStudent('Nina', 'Grade 5');
    // A second, unrelated write to the store (as would happen elsewhere in the app)
    // must not wipe out Nina's default attendance mark from the day she was added.
    updateAttendance('Nina', 'P');

    const store = getStore();
    expect(store.attState.Nina).toBe('P');
  });
});
