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

describe('data-driven profile content generation', () => {
  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    global.window = globalThis;
  });

  it('generates profile content from computed risk for any student name', async () => {
    const { computeRisk } = await import('../src/app.js');
    const { generateStudentProfileData } = await import('../src/app.js');

    // Setup state with a student who is NOT one of the 3 hardcoded demo students
    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Unknown Student Name'],
      attendanceLog: { 'Unknown Student Name': { '2026-08-01': 'A', '2026-08-02': 'A', '2026-08-03': 'A' } },
      attState: { 'Unknown Student Name': 'A' },
      assessments: [{ id: 'math1', maxScore: 100, type: 'in-class' }],
      submissions: { math1: { 'Unknown Student Name': { score: 65, submitted: true } } },
      assessScores: {},
      behaviorLogs: [
        { student: 'Unknown Student Name', tag: 'Disruptive', timestamp: Date.now() }
      ],
      careInteractions: [],
      workflows: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    }));

    // Generate profile for the unknown student
    const profileData = generateStudentProfileData('Unknown Student Name');
    
    // Verify it contains the actual student's name, not a fallback
    expect(profileData.studentName).toBe('Unknown Student Name');
    
    // Verify it contains computed risk data
    expect(profileData.tier).toBeDefined();
    expect(['clear', 'monitoring', 'flagged', 'critical']).toContain(profileData.tier);
    
    // Verify it contains reasons from the computed risk
    expect(profileData.reasons).toBeDefined();
    expect(Array.isArray(profileData.reasons)).toBe(true);
    
    // Verify it includes behavior log information
    expect(profileData.behaviorLogs).toBeDefined();
    expect(Array.isArray(profileData.behaviorLogs)).toBe(true);
  });

  it('does not fall back to hardcoded persona data for unknown students', async () => {
    const { generateStudentProfileData } = await import('../src/app.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Alice Bob'],
      attendanceLog: { 'Alice Bob': { '2026-08-01': 'P' } },
      attState: { 'Alice Bob': 'P' },
      assessments: [],
      submissions: {},
      assessScores: {},
      behaviorLogs: [],
      careInteractions: [],
      workflows: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    }));

    const profileData = generateStudentProfileData('Alice Bob');
    
    // The student name should NOT be one of the hardcoded 3
    expect(profileData.studentName).toBe('Alice Bob');
    expect(['Maria Santos', 'Dante Pascual', 'Carla Garcia']).not.toContain(profileData.studentName);
    
    // Content should be generated from computed data, not a hardcoded fallback
    expect(profileData.demoMode).toBe(false);
  });

  it('marks demo mode when displaying hardcoded 3-student examples', async () => {
    const { generateStudentProfileData } = await import('../src/app.js');

    localStorage.setItem('educare_local_state', JSON.stringify({
      teacherId: 'teacher-1',
      teacherName: 'Ada',
      pin: '1234',
      students: ['Maria Santos'],
      attendanceLog: {},
      attState: {},
      assessments: [],
      submissions: {},
      assessScores: {},
      behaviorLogs: [],
      careInteractions: [],
      workflows: [],
      syncMeta: { attState: {}, assessScores: {}, workflows: {}, behaviorLogs: {}, careInteractions: {} }
    }));

    const profileData = generateStudentProfileData('Maria Santos');
    
    // When displaying the hardcoded demo student, explicitly mark it as demo mode
    expect(profileData.demoMode).toBe(true);
  });
});
