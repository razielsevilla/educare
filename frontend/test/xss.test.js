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

  // Note: once a value is placed inside a quoted HTML attribute (e.g. data-student="..."),
  // the browser/jsdom's HTML parser only requires the quote character itself to be escaped
  // to prevent breaking out of the attribute — raw `<`/`>` inside an attribute VALUE are
  // inert text, not markup, so innerHTML round-trips them unescaped on read-back without
  // that being exploitable. The real safety checks are: (1) no live element (e.g. <img>)
  // was actually injected into the DOM, and (2) the value survives intact for JS to read
  // via .dataset, rather than being used to construct an inline onclick="...('${name}')"
  // string that the malicious quote could break out of.

  it('renders a malicious student name safely in the attendance sealed-record view', async () => {
    await import('../src/app.js');

    const maliciousName = '"><img src=x onerror=alert(1)>';
    document.body.innerHTML = `
      <div id="attWorkspace"></div>
      <div id="toast"><span id="toast-msg"></span></div>
    `;

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      students: [maliciousName],
      attendanceLog: {},
      attState: { [maliciousName]: 'A' },
      assessments: [], submissions: {}, workflows: [], behaviorLogs: [], careInteractions: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {} }
    }));

    window.startRollCall();
    window.recordAttendanceAndNext('A'); // 1 student -> immediately reaches the sealed view

    const el = document.getElementById('attWorkspace');
    expect(el.querySelectorAll('img').length).toBe(0);

    const markLateBtn = document.querySelector('.mark-late-btn');
    expect(markLateBtn.getAttribute('onclick')).toBeNull();
    expect(markLateBtn.dataset.student).toBe(maliciousName);
  });

  it('renders a malicious student name safely in the behavior grid', async () => {
    await import('../src/app.js');

    const maliciousName = '"><img src=x onerror=alert(1)>';
    document.body.innerHTML = `<div id="behavior-grid"></div>`;

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      students: [maliciousName],
      attendanceLog: {}, attState: {}, assessments: [], submissions: {},
      workflows: [], behaviorLogs: [], careInteractions: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {} }
    }));

    window.renderBehaviorGrid();

    const el = document.getElementById('behavior-grid');
    expect(el.querySelectorAll('img').length).toBe(0);
    const item = el.querySelector('.behavior-grid-item');
    expect(item.getAttribute('onclick')).toBeNull();
    expect(item.dataset.student).toBe(maliciousName);
  });

  it('renders a malicious class name safely in the class switcher', async () => {
    await import('../src/app.js');

    const maliciousName = '"><img src=x onerror=alert(1)>';
    document.body.innerHTML = `
      <div id="class-modal"><div id="class-options-container"></div></div>
      <div id="class-overlay"></div>
    `;

    localStorage.setItem('educare_classes', JSON.stringify([{ name: maliciousName, isAdvisory: true }]));
    localStorage.setItem('educare_current_class', '');

    window.openClassSelect();

    const container = document.getElementById('class-options-container');
    expect(container.querySelectorAll('img').length).toBe(0);
    const option = container.querySelector('.class-option');
    expect(option.getAttribute('onclick')).toBeNull();
    expect(option.dataset.className).toBe(maliciousName);
  });
});
