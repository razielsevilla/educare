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

describe('FE-4/FE-5 real behavior + care history shown on the student profile', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    global.window = globalThis;
    document.body.innerHTML = `
      <div id="screen-profile">
        <div class="profile-hero"></div>
        <div id="prof-insights"></div>
        <div id="tab-history"></div>
      </div>
      <div id="screen-care">
        <div class="top-bar-sub"></div>
        <div id="care-step-1"></div>
        <div id="care-step-3"></div>
        <div class="scroll-area"></div>
      </div>
      <div id="ac1"><div class="action-title"></div><div class="action-sub"></div><div class="action-icon"></div></div>
    `;
  });

  it('shows real logged behavior tags and care interactions in the profile history tab, not hardcoded mock content', async () => {
    const { addBehaviorLog, addCareInteraction } = await import('../src/store.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Nina'],
      attendanceLog: {},
      attState: {},
      assessments: [],
      submissions: {},
      workflows: [],
      behaviorLogs: [],
      careInteractions: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    }));

    addBehaviorLog('Nina', 'Withdrawn');
    addCareInteraction('Nina', 'check-in', 'improving', 'Talked about home situation.');

    await import('../src/app.js');
    window.openProfile('Nina');

    const historyHtml = document.getElementById('tab-history').innerHTML;
    expect(historyHtml).toContain('Withdrawn');
    expect(historyHtml).toContain('check-in');
    expect(historyHtml).toContain('Talked about home situation.');
    // The old static mock timeline referenced a fixed "Jun 14/Jun 10" demo narrative —
    // make sure that's gone in favor of this student's real logged data.
    expect(historyHtml).not.toContain('Escalated to counselor');
  });

  it('shows an empty-state message when a student has no history yet', async () => {
    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Omar'],
      attendanceLog: {},
      attState: {},
      assessments: [],
      submissions: {},
      workflows: [],
      behaviorLogs: [],
      careInteractions: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    }));

    await import('../src/app.js');
    window.openProfile('Omar');

    const historyHtml = document.getElementById('tab-history').innerHTML;
    expect(historyHtml).toContain('No care interactions or behavior logs recorded yet.');
  });
});
