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

describe('FE-9 stored-XSS prevention', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    global.window = globalThis;
    
    // Set up a mock DOM environment so renderDynamicScreens can run
    document.body.innerHTML = `
      <div id="rosterContainer"></div>
      <div id="dash-class-name"></div>
      <div id="dash-class-type"></div>
    `;
  });

  it('escapes malicious HTML in user input', async () => {
    const { escapeHtml } = await import('../src/ui.js');

    const maliciousName = '"><img src=x onerror=alert(1)>';
    const escaped = escapeHtml(maliciousName);

    // Assert that the script payload is neutralized
    expect(escaped).not.toContain('<img');
    expect(escaped).not.toContain('">');
    expect(escaped).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(escaped).toContain('&quot;&gt;');
  });

  it('safely handles null or undefined values', async () => {
    const { escapeHtml } = await import('../src/ui.js');

    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
  
  it('renders a malicious student name safely in the roster without executing scripts', async () => {
    const { escapeHtml } = await import('../src/app.js');
    
    const maliciousName = '"><img src=x onerror=alert(1)>';
    
    // Setup state
    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      students: [maliciousName],
      attendanceLog: {},
      attState: {},
      assessments: [],
      submissions: {},
      assessScores: {},
      workflows: [],
      behaviorLogs: [],
      careInteractions: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    }));
    
    // Call render
    window.renderDynamicScreens();
    
    const rosterHtml = document.getElementById('rosterContainer').innerHTML;
    
    // Assert the malicious payload wasn't rendered as live HTML
    expect(rosterHtml).not.toContain('<img src="x"');
    expect(rosterHtml).not.toContain('onerror="alert(1)"');
    expect(rosterHtml).toContain('&lt;img src=x onerror=alert(1)&gt;');
    
    // Also assert that the click handler was properly wired without inline onclick
    const rosterEl = document.getElementById('rosterContainer');
    const row = rosterEl.querySelector('.student-row');
    expect(row.getAttribute('onclick')).toBeNull(); // No inline onclick string
    expect(row.dataset.action).toBe('openProfile');
    expect(row.dataset.student).toBe('"><img src=x onerror=alert(1)>');
  });
});
