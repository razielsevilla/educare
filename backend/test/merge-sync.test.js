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

describe('EduCare sync merge strategy', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
  });

  it('merges independent student edits without dropping the other device’s changes', async () => {
    const { mergeSyncState } = await import('../../frontend/src/store.js');

    const localState = {
      attState: { Alice: 'P', Bob: 'A' },
      assessScores: { Alice: 85 },
      workflows: [
        { id: 'w-1', student: 'Alice', stage: 'monitoring', updatedAt: 100 }
      ],
      syncMeta: {
        attState: { Alice: { value: 'P', updatedAt: 100 }, Bob: { value: 'A', updatedAt: 100 } },
        assessScores: { Alice: { value: 85, updatedAt: 100 } },
        workflows: { 'w-1': { updatedAt: 100 } }
      }
    };

    const remoteState = {
      attState: { Bob: 'P' },
      assessScores: { Carla: 91 },
      workflows: [
        { id: 'w-2', student: 'Carla', stage: 'recovery', updatedAt: 200 }
      ],
      syncMeta: {
        attState: { Bob: { value: 'P', updatedAt: 200 } },
        assessScores: { Carla: { value: 91, updatedAt: 200 } },
        workflows: { 'w-2': { updatedAt: 200 } }
      }
    };

    const merged = mergeSyncState(localState, remoteState);

    expect(merged.attState).toEqual({ Alice: 'P', Bob: 'P' });
    expect(merged.assessScores).toEqual({ Alice: 85, Carla: 91 });
    expect(merged.workflows).toHaveLength(2);
    expect(merged.workflows.some((w) => w.student === 'Alice')).toBe(true);
    expect(merged.workflows.some((w) => w.student === 'Carla')).toBe(true);
  });

  it('keeps the newest value when both devices change the same record', () => {
    const { mergeSyncState } = require('../../frontend/src/store.js');

    const localState = {
      attState: { Dana: 'P' },
      assessScores: { Dana: 80 },
      workflows: [{ id: 'w-d', student: 'Dana', stage: 'monitoring', updatedAt: 300 }],
      syncMeta: {
        attState: { Dana: { value: 'P', updatedAt: 300 } },
        assessScores: { Dana: { value: 80, updatedAt: 300 } },
        workflows: { 'w-d': { updatedAt: 300 } }
      }
    };

    const remoteState = {
      attState: { Dana: 'A' },
      assessScores: { Dana: 90 },
      workflows: [{ id: 'w-d', student: 'Dana', stage: 'monitoring', updatedAt: 500 }],
      syncMeta: {
        attState: { Dana: { value: 'A', updatedAt: 500 } },
        assessScores: { Dana: { value: 90, updatedAt: 500 } },
        workflows: { 'w-d': { updatedAt: 500 } }
      }
    };

    const merged = mergeSyncState(localState, remoteState);

    expect(merged.attState.Dana).toBe('A');
    expect(merged.assessScores.Dana).toBe(90);
    expect(merged.workflows[0].updatedAt).toBe(500);
  });
});
