// @vitest-environment jsdom
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

describe('FE-5 follow-ups due surfaced in the Response screen', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    global.window = globalThis;
    document.body.innerHTML = `<div id="responseContainer"></div>`;
  });

  it('renders a due follow-up with prior context and no due follow-ups are hidden', async () => {
    const { addCareInteraction } = await import('../src/store.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: [],
      careInteractions: [],
      workflows: [],
      behaviorLogs: [],
      syncMeta: { careInteractions: {}, workflows: {}, behaviorLogs: {} }
    }));

    addCareInteraction('Mia', 'parent-contact', 'unchanged', 'Called parent, no answer.');
    const state = JSON.parse(localStorage.getItem('educare_local_state'));
    state.careInteractions[0].followUpDate = Date.now() - 24 * 60 * 60 * 1000; // due yesterday
    localStorage.setItem('educare_local_state', JSON.stringify(state));

    await import('../src/app.js');
    window.renderDynamicScreens();

    const html = document.getElementById('responseContainer').innerHTML;
    expect(html).toContain('Follow-ups Due');
    expect(html).toContain('Mia');
    expect(html).toContain('parent-contact');
    expect(html).toContain('unchanged');

    const row = document.querySelector('[data-action="openProfile"]');
    expect(row).not.toBeNull();
    expect(row.dataset.student).toBe('Mia');
  });

  it('does not show the Follow-ups Due section when nothing is due', async () => {
    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: [],
      careInteractions: [],
      workflows: [],
      behaviorLogs: [],
      syncMeta: { careInteractions: {}, workflows: {}, behaviorLogs: {} }
    }));

    await import('../src/app.js');
    window.renderDynamicScreens();

    const html = document.getElementById('responseContainer').innerHTML;
    expect(html).not.toContain('Follow-ups Due');
  });
});
