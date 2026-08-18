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

describe('care interaction log and follow-ups', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    global.window = globalThis;
  });

  it('persists a care interaction with student, action, outcome, and computed follow-up date', async () => {
    const { addCareInteraction, getCareInteractionsForStudent } = await import('../src/store.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Mia'],
      careInteractions: [],
      syncMeta: { careInteractions: {} }
    }));

    // Add a care interaction
    const now = Date.now();
    const interaction = addCareInteraction('Mia', 'parent-call', 'improving', 'Called parent, discussed morning routine.');
    
    expect(interaction).toBeDefined();
    expect(interaction.student).toBe('Mia');
    expect(interaction.actionTaken).toBe('parent-call');
    expect(interaction.outcomeSelected).toBe('improving');
    expect(interaction.notes).toBe('Called parent, discussed morning routine.');
    expect(interaction.timestamp).toBeDefined();
    
    // Follow-up should be 7 days from now (in milliseconds)
    const expectedFollowUp = now + (7 * 24 * 60 * 60 * 1000);
    expect(interaction.followUpDate).toBeDefined();
    expect(Math.abs(interaction.followUpDate - expectedFollowUp)).toBeLessThan(2000); // Allow 2 sec tolerance
  });

  it('queries for follow-ups due today or earlier', async () => {
    const { addCareInteraction, getCareInteractionsDue } = await import('../src/store.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Mia', 'Jose'],
      careInteractions: [],
      syncMeta: { careInteractions: {} }
    }));

    const now = Date.now();

    // Add an interaction with follow-up in the past (due today or earlier)
    const pastFollowUp = now - (1 * 24 * 60 * 60 * 1000); // 1 day ago
    const interaction1 = addCareInteraction('Mia', 'parent-call', 'improving', 'Called parent.');
    // Manually set the followUpDate to the past
    const state = JSON.parse(localStorage.getItem('educare_local_state'));
    state.careInteractions[0].followUpDate = pastFollowUp;
    localStorage.setItem('educare_local_state', JSON.stringify(state));

    // Add an interaction with follow-up in the future (not due)
    const futureFollowUp = now + (10 * 24 * 60 * 60 * 1000); // 10 days from now
    const interaction2 = addCareInteraction('Jose', 'in-class-check', 'unchanged', 'Observed during class.');
    const state2 = JSON.parse(localStorage.getItem('educare_local_state'));
    state2.careInteractions[1].followUpDate = futureFollowUp;
    localStorage.setItem('educare_local_state', JSON.stringify(state2));

    // Query for follow-ups due
    const due = getCareInteractionsDue();
    
    expect(due.length).toBe(1);
    expect(due[0].student).toBe('Mia');
    expect(due[0].actionTaken).toBe('parent-call');
  });
});
