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

describe('behavior log risk detection', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    global.window = globalThis;
  });

  it('raises risk when an incident tag is logged for a student', async () => {
    const { computeRisk } = await import('../src/app.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Mia'],
      attendanceLog: { Mia: { '2026-08-01': 'P' } },
      attState: { Mia: 'P' },
      assessments: [],
      submissions: {},
      behaviorLogs: [
        { student: 'Mia', tag: 'Incident', timestamp: Date.now() }
      ],
      workflows: [],
      syncMeta: { attState: {}, attendanceLog: {}, behaviorLogs: {}, assessScores: {}, workflows: {} }
    }));

    const risk = computeRisk('Mia');
    expect(risk.tier).toBe('flagged');
    expect(risk.reasons.some((reason) => /incident/i.test(reason))).toBe(true);
  });
});
