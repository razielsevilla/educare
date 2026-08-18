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
});
