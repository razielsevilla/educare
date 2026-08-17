// src/store.js
import { encryptSyncBlob, decryptSyncBlob, looksLikeEncryptedBlob } from './crypto.js';

const STORE_KEY = 'educare_local_state';

const defaultState = {
  teacherId: localStorage.getItem('educare_teacher_id') || '',
  teacherName: localStorage.getItem('educare_teacher_name') || '',
  authToken: localStorage.getItem('educare_auth_token') || '',
  pin: localStorage.getItem('educare_pin') || '',
  classes: JSON.parse(localStorage.getItem('educare_classes') || '[]'),
  currentClass: localStorage.getItem('educare_current_class') || '',
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
  if (state.authToken) localStorage.setItem('educare_auth_token', state.authToken);
  if (state.pin !== undefined) localStorage.setItem('educare_pin', state.pin);
  if (state.currentClass !== undefined) localStorage.setItem('educare_current_class', state.currentClass);
  if (state.classes) localStorage.setItem('educare_classes', JSON.stringify(state.classes));
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
  const state = getStore();
  const activeClass = state.currentClass || '';
  return (state.students || [])
    .filter(s => typeof s === 'object' ? s.class === activeClass : true)
    .map(s => typeof s === 'object' ? s.name : s);
};

export const addStudent = (name, className) => {
  const state = getStore();
  const cls = className || state.currentClass;
  if (!state.students) state.students = [];
  const exists = state.students.some(s => 
    typeof s === 'object' ? (s.name === name && s.class === cls) : s === name
  );
  if (!exists) {
    state.students.push({ name, class: cls });
    state.attState[name] = 'P'; // Default attendance
    saveStore(state);
  }
};

export const addClass = (className, isAdvisory = false) => {
  const state = getStore();
  if (!state.classes) state.classes = [];
  const exists = state.classes.some(c => c.name === className);
  if (!exists) {
    state.classes.push({ name: className, isAdvisory });
    if (!state.currentClass) {
      state.currentClass = className;
    }
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

// Returns the encrypted blob for syncing.
export const getSyncBlob = async () => {
  const state = getStore();
  const passphrase = state.pin || '';
  if (!state.teacherId) {
    throw new Error('teacherId is required before syncing encrypted state');
  }
  if (!passphrase) {
    throw new Error('PIN/passphrase is required to derive the sync encryption key');
  }

  return encryptSyncBlob(JSON.stringify({
    attState: state.attState,
    assessScores: state.assessScores,
    workflows: state.workflows
  }), passphrase, state.teacherId);
};

export const applySyncBlob = async (blobStr, newSyncId) => {
  try {
    const state = getStore();
    if (!looksLikeEncryptedBlob(blobStr)) {
      throw new Error('Blob is not an encrypted EduCare sync payload');
    }

    const passphrase = state.pin || '';
    if (!passphrase) {
      throw new Error('PIN/passphrase is required to decrypt the sync payload');
    }

    const decrypted = await decryptSyncBlob(blobStr, passphrase, state.teacherId);
    const remoteData = JSON.parse(decrypted);
    state.attState = { ...state.attState, ...remoteData.attState };
    state.assessScores = { ...state.assessScores, ...remoteData.assessScores };
    state.workflows = remoteData.workflows || state.workflows;
    state.lastSyncId = newSyncId;
    saveStore(state);
    return true;
  } catch (e) {
    console.error('Failed to apply sync blob', e);
    return false;
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
