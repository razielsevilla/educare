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

describe('personal baseline risk detection', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    global.window = globalThis;
  });

  it('flags a high-performing student when a recent passing score drops far below their baseline', async () => {
    const { computeRisk } = await import('../src/app.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Jordan'],
      attendanceLog: { Jordan: { '2026-08-01': 'P', '2026-08-02': 'P', '2026-08-03': 'P' } },
      attState: { Jordan: 'P' },
      assessments: [
        { id: 'a1', type: 'in-class', maxScore: 100 },
        { id: 'a2', type: 'in-class', maxScore: 100 },
        { id: 'a3', type: 'in-class', maxScore: 100 },
        { id: 'a4', type: 'in-class', maxScore: 100 },
        { id: 'a5', type: 'in-class', maxScore: 100 }
      ],
      submissions: {
        a1: { Jordan: { score: 95 } },
        a2: { Jordan: { score: 93 } },
        a3: { Jordan: { score: 96 } },
        a4: { Jordan: { score: 94 } },
        a5: { Jordan: { score: 80 } }
      },
      assessScores: {},
      workflows: [],
      syncMeta: { attState: {}, attendanceLog: {}, assessScores: {}, workflows: {} }
    }));

    const risk = computeRisk('Jordan');
    expect(risk.tier).toBe('flagged');
    expect(risk.reasons.some((reason) => reason.includes('baseline'))).toBe(true);
  });

  it('does not flag a stable low-scoring student when their scores remain near their own baseline', async () => {
    const { computeRisk } = await import('../src/app.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Sam'],
      attendanceLog: { Sam: { '2026-08-01': 'P', '2026-08-02': 'P', '2026-08-03': 'P' } },
      attState: { Sam: 'P' },
      assessments: [
        { id: 'b1', type: 'in-class', maxScore: 100 },
        { id: 'b2', type: 'in-class', maxScore: 100 },
        { id: 'b3', type: 'in-class', maxScore: 100 },
        { id: 'b4', type: 'in-class', maxScore: 100 },
        { id: 'b5', type: 'in-class', maxScore: 100 }
      ],
      submissions: {
        b1: { Sam: { score: 58 } },
        b2: { Sam: { score: 60 } },
        b3: { Sam: { score: 59 } },
        b4: { Sam: { score: 61 } },
        b5: { Sam: { score: 60 } }
      },
      assessScores: {},
      workflows: [],
      syncMeta: { attState: {}, attendanceLog: {}, assessScores: {}, workflows: {} }
    }));

    const risk = computeRisk('Sam');
    expect(risk.reasons.some((reason) => reason.includes('baseline'))).toBe(false);
    // Sam has enough history to establish a personal baseline, so the flat absolute
    // thresholds (which would otherwise flag any ~60% average as critical) must not
    // apply — only a deviation from Sam's OWN baseline should be able to flag Sam.
    expect(risk.tier).toBe('clear');
  });

  it('falls back to the flat absolute threshold for a student with insufficient history for a baseline', async () => {
    const { computeRisk } = await import('../src/app.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Riley'],
      attendanceLog: { Riley: { '2026-08-01': 'P', '2026-08-02': 'P' } },
      attState: { Riley: 'P' },
      // Only 2 in-class scores — below the 4-prior-sample minimum needed to trust a
      // personal baseline, so the flat threshold fallback should still apply.
      assessments: [
        { id: 'c1', type: 'in-class', maxScore: 100 },
        { id: 'c2', type: 'in-class', maxScore: 100 }
      ],
      submissions: {
        c1: { Riley: { score: 60 } },
        c2: { Riley: { score: 62 } }
      },
      assessScores: {},
      workflows: [],
      syncMeta: { attState: {}, attendanceLog: {}, assessScores: {}, workflows: {} }
    }));

    const risk = computeRisk('Riley');
    expect(risk.tier).toBe('critical');
    expect(risk.reasons.some((reason) => reason.includes('Low average score'))).toBe(true);
  });
});
