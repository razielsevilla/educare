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

describe('rolling-window risk detection', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    global.window = globalThis;
  });

  it('does not flag a student below the 14-day absence threshold', async () => {
    const { computeRisk } = await import('../src/app.js');
    const today = new Date();
    const day1 = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const day2 = new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const day3 = new Date(today.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Ava'],
      attendanceLog: {
        Ava: {
          [today.toISOString().slice(0, 10)]: 'P',
          [day1]: 'A',
          [day2]: 'P',
          [day3]: 'A'
        }
      },
      attState: { Ava: 'P' },
      assessments: [],
      submissions: {},
      assessScores: {},
      workflows: [],
      syncMeta: { attState: {}, attendanceLog: {}, assessScores: {}, workflows: {} }
    }));

    const risk = computeRisk('Ava');
    expect(risk.tier).not.toBe('critical');
    expect(risk.reasons.some((reason) => reason.includes('absences in the last 14 days'))).toBe(false);
  });

  it('flags a student exactly at the 3-absence threshold in a 14-day window', async () => {
    const { computeRisk } = await import('../src/app.js');
    const today = new Date();
    const day1 = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const day2 = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const day3 = new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Ava'],
      attendanceLog: {
        Ava: {
          [today.toISOString().slice(0, 10)]: 'P',
          [day1]: 'A',
          [day2]: 'A',
          [day3]: 'A'
        }
      },
      attState: { Ava: 'P' },
      assessments: [],
      submissions: {},
      assessScores: {},
      workflows: [],
      syncMeta: { attState: {}, attendanceLog: {}, assessScores: {}, workflows: {} }
    }));

    const risk = computeRisk('Ava');
    expect(risk.tier).toBe('critical');
    expect(risk.reasons.some((reason) => reason.includes('3 absences in the last 14 days'))).toBe(true);
  });

  it('ignores absences outside the rolling 14-day window', async () => {
    const { computeRisk } = await import('../src/app.js');
    const today = new Date();
    const recent1 = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recent2 = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const older = new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Ava'],
      attendanceLog: {
        Ava: {
          [today.toISOString().slice(0, 10)]: 'P',
          [recent1]: 'A',
          [recent2]: 'A',
          [older]: 'A'
        }
      },
      attState: { Ava: 'P' },
      assessments: [],
      submissions: {},
      assessScores: {},
      workflows: [],
      syncMeta: { attState: {}, attendanceLog: {}, assessScores: {}, workflows: {} }
    }));

    const risk = computeRisk('Ava');
    expect(risk.tier).not.toBe('critical');
    expect(risk.reasons.some((reason) => reason.includes('3 absences in the last 14 days'))).toBe(false);
  });
});
