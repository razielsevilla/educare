// src/store.js

const STORE_KEY = 'educare_local_state';

const defaultState = {
  teacherId: localStorage.getItem('educare_teacher_id') || '',
  teacherName: localStorage.getItem('educare_teacher_name') || '',
  lastSyncId: parseInt(localStorage.getItem('educare_last_sync_id') || '0', 10),
  students: [],
  attState: {},
  assessments: [],
  submissions: {},
  assessScores: {},
  workflows: []
};


export const getStore = () => {
  const stored = localStorage.getItem(STORE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse store', e);
      return { ...defaultState };
    }
  }
  return { ...defaultState };
};

export const saveStore = (state) => {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  if (state.teacherId) localStorage.setItem('educare_teacher_id', state.teacherId);
  if (state.teacherName) localStorage.setItem('educare_teacher_name', state.teacherName);
  localStorage.setItem('educare_last_sync_id', state.lastSyncId.toString());
};

export const updateAttendance = (student, status) => {
  const state = getStore();
  state.attState[student] = status;
  saveStore(state);
};

export const getAttendance = () => {
  return getStore().attState;
};

// Alias for getAttendance — used by app.js
export const getAttState = getAttendance;

export const getAssessments = () => {
  return getStore().assessments || [];
};

export const getSubmissions = () => {
  return getStore().submissions || {};
};

export const getStudents = () => {
  return getStore().students;
};

export const addStudent = (name) => {
  const state = getStore();
  if (!state.students.includes(name)) {
    state.students.push(name);
    state.attState[name] = 'P'; // Default attendance
    saveStore(state);
  }
};

export const fillMockData = () => {
  const state = getStore();
  
  // Reset all existing records to empty state
  state.students = [];
  state.attState = {};
  state.assessments = [];
  state.submissions = {};
  state.assessScores = {};
  state.workflows = [];

  const mockStudents = [
    'Maria Santos', 'Jose Reyes', 'Carla Garcia', 'Ana Lim', 'Juan Pablo Cruz',
    'Ben Torres', 'Rosa Lopez', 'Miguel Villanueva', 'Karla Dela Cruz', 'Paolo Bautista',
    'Rica Mendoza', 'Dante Pascual', 'Lea Santos', 'Marco Tan', 'Nina Cruz',
    'Edgar Ramos', 'Fatima Ali', 'Rolando Perez', 'Angie Gomez', 'Carlo Diaz'
  ];
  
  mockStudents.forEach(s => {
    state.students.push(s);
    state.attState[s] = 'P'; // Default attendance
  });
  
  saveStore(state);
};

// Returns the full blob for syncing
export const getSyncBlob = () => {
  const state = getStore();
  // Strip out local-only fields if needed, but for now send everything
  return JSON.stringify({
    attState: state.attState,
    assessScores: state.assessScores,
    workflows: state.workflows
  });
};

export const applySyncBlob = (blobStr, newSyncId) => {
  try {
    const remoteData = JSON.parse(blobStr);
    const state = getStore();
    // Merge logic: simple overwrite for V1
    state.attState = { ...state.attState, ...remoteData.attState };
    state.assessScores = { ...state.assessScores, ...remoteData.assessScores };
    state.workflows = remoteData.workflows || state.workflows;
    state.lastSyncId = newSyncId;
    saveStore(state);
  } catch (e) {
    console.error('Failed to apply sync blob', e);
  }
};

export const moveToRecovery = (student) => {
  const state = getStore();
  if (!state.workflows) state.workflows = [];
  const idx = state.workflows.findIndex(w => w.student === student);
  if (idx !== -1) {
    state.workflows[idx].stage = 'recovery';
    state.workflows[idx].timestamp = Date.now();
  } else {
    state.workflows.push({ student, stage: 'recovery', timestamp: Date.now() });
  }
  saveStore(state);
};

export const getWorkflows = () => {
  return getStore().workflows || [];
};
