// src/store.js
import { encryptSyncBlob, decryptSyncBlob, looksLikeEncryptedBlob } from './crypto.js';

const STORE_KEY = 'educare_local_state';

const getDateKey = (date = new Date()) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().slice(0, 10);
};

const deriveCurrentAttendance = (attendanceLog = {}) => {
  const todayKey = getDateKey();
  const current = {};

  Object.entries(attendanceLog || {}).forEach(([student, records]) => {
    if (records && typeof records === 'object' && records[todayKey] !== undefined) {
      current[student] = records[todayKey];
    }
  });

  return current;
};

const normalizeAttendanceLog = (attendanceLog = {}) => {
  const normalized = {};

  Object.entries(attendanceLog || {}).forEach(([student, records]) => {
    if (!records || typeof records !== 'object' || Array.isArray(records)) {
      return;
    }

    normalized[student] = Object.fromEntries(
      Object.entries(records).map(([dateKey, value]) => [dateKey, value])
    );
  });

  return normalized;
};

const mergeAttendanceLogs = (baseLog = {}, remoteLog = {}) => {
  const merged = { ...normalizeAttendanceLog(baseLog) };

  Object.entries(normalizeAttendanceLog(remoteLog)).forEach(([student, records]) => {
    merged[student] = { ...(merged[student] || {}), ...(records || {}) };
  });

  return merged;
};

const migrateLegacyAttendance = (state = {}) => {
  const legacyLog = normalizeAttendanceLog(state.attendanceLog || {});
  const legacyAttState = state.attState || {};
  const todayKey = getDateKey();

  if (Object.keys(legacyLog).length === 0 && Object.keys(legacyAttState).length > 0) {
    Object.entries(legacyAttState).forEach(([student, value]) => {
      legacyLog[student] = { [todayKey]: value };
    });
  }

  state.attendanceLog = legacyLog;
  state.attState = deriveCurrentAttendance(state.attendanceLog);
  return state;
};

const defaultState = {
  teacherId: localStorage.getItem('educare_teacher_id') || '',
  teacherName: localStorage.getItem('educare_teacher_name') || '',
  authToken: localStorage.getItem('educare_auth_token') || '',
  pin: localStorage.getItem('educare_pin') || '',
  classes: JSON.parse(localStorage.getItem('educare_classes') || '[]'),
  currentClass: localStorage.getItem('educare_current_class') || '',
  lastSyncId: parseInt(localStorage.getItem('educare_last_sync_id') || '0', 10),
  students: [],
  attendanceLog: {},
  attState: {},
  assessments: [],
  submissions: {},
  assessScores: {},
  workflows: [],
  behaviorLogs: [],
  careInteractions: [],
  syncMeta: {
    attState: {},
    assessScores: {},
    workflows: {},
    behaviorLogs: {},
    careInteractions: {}
  }
};

const normalizeTimestamp = (value, fallback = Date.now()) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const buildSyncMeta = (state = {}) => {
  const attStateMeta = {};
  Object.entries(state.attState || {}).forEach(([key, value]) => {
    const updatedAt = normalizeTimestamp(state.syncMeta?.attState?.[key]?.updatedAt, Date.now());
    attStateMeta[key] = { value, updatedAt };
  });

  const attendanceLogMeta = {};
  Object.entries(state.attendanceLog || {}).forEach(([student, records]) => {
    attendanceLogMeta[student] = {};
    Object.entries(records || {}).forEach(([dateKey, value]) => {
      const updatedAt = normalizeTimestamp(state.syncMeta?.attendanceLog?.[student]?.[dateKey]?.updatedAt, Date.now());
      attendanceLogMeta[student][dateKey] = { value, updatedAt };
    });
  });

  const assessScoresMeta = {};
  Object.entries(state.assessScores || {}).forEach(([key, value]) => {
    const updatedAt = normalizeTimestamp(state.syncMeta?.assessScores?.[key]?.updatedAt, Date.now());
    assessScoresMeta[key] = { value, updatedAt };
  });

  const workflowsMeta = {};
  (state.workflows || []).forEach((workflow) => {
    const workflowId = workflow.id || `${workflow.student || 'unknown'}:${workflow.stage || 'stage'}:${normalizeTimestamp(workflow.updatedAt ?? workflow.timestamp, Date.now())}`;
    const updatedAt = normalizeTimestamp(workflow.updatedAt ?? workflow.timestamp, Date.now());
    workflowsMeta[workflowId] = { updatedAt };
  });

  const behaviorLogsMeta = {};
  (state.behaviorLogs || []).forEach((log) => {
    const logId = log.id || `${log.student || 'unknown'}:${log.tag || 'tag'}:${normalizeTimestamp(log.timestamp, Date.now())}`;
    const updatedAt = normalizeTimestamp(log.timestamp, Date.now());
    behaviorLogsMeta[logId] = { updatedAt };
  });

  const careInteractionsMeta = {};
  (state.careInteractions || []).forEach((interaction) => {
    const interactionId = interaction.id || `${interaction.student || 'unknown'}:${normalizeTimestamp(interaction.timestamp, Date.now())}`;
    const updatedAt = normalizeTimestamp(interaction.timestamp, Date.now());
    careInteractionsMeta[interactionId] = { updatedAt };
  });

  return {
    attState: attStateMeta,
    attendanceLog: attendanceLogMeta,
    assessScores: assessScoresMeta,
    workflows: workflowsMeta,
    behaviorLogs: behaviorLogsMeta,
    careInteractions: careInteractionsMeta
  };
};

const mergeValueMaps = (localMap = {}, remoteMap = {}, localMeta = {}, remoteMeta = {}) => {
  const merged = { ...localMap };
  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(remoteMap)]);

  allKeys.forEach((key) => {
    const localValue = localMap[key];
    const remoteValue = remoteMap[key];
    const localUpdatedAt = normalizeTimestamp(localMeta[key]?.updatedAt, 0);
    const remoteUpdatedAt = normalizeTimestamp(remoteMeta[key]?.updatedAt, 0);

    if (remoteValue !== undefined && (remoteUpdatedAt > localUpdatedAt || (localValue === undefined && remoteValue !== undefined))) {
      merged[key] = remoteValue;
    } else if (localValue !== undefined) {
      merged[key] = localValue;
    } else if (remoteValue !== undefined) {
      merged[key] = remoteValue;
    }
  });

  return merged;
};

export const mergeSyncState = (localState = {}, remoteState = {}) => {
  const localAttState = localState.attState || {};
  const remoteAttState = remoteState.attState || {};
  const localAttendanceLog = normalizeAttendanceLog(localState.attendanceLog || {});
  const remoteAttendanceLog = normalizeAttendanceLog(remoteState.attendanceLog || {});
  const localAssessScores = localState.assessScores || {};
  const remoteAssessScores = remoteState.assessScores || {};

  const mergedAttState = mergeValueMaps(
    localAttState,
    remoteAttState,
    localState.syncMeta?.attState || {},
    remoteState.syncMeta?.attState || {}
  );

  const mergedAttendanceLog = {};
  const allStudents = new Set([...Object.keys(localAttendanceLog), ...Object.keys(remoteAttendanceLog)]);
  allStudents.forEach((student) => {
    const mergedRecords = mergeValueMaps(
      localAttendanceLog[student] || {},
      remoteAttendanceLog[student] || {},
      localState.syncMeta?.attendanceLog?.[student] || {},
      remoteState.syncMeta?.attendanceLog?.[student] || {}
    );
    if (Object.keys(mergedRecords).length > 0) {
      mergedAttendanceLog[student] = mergedRecords;
    }
  });

  const mergedAssessScores = mergeValueMaps(
    localAssessScores,
    remoteAssessScores,
    localState.syncMeta?.assessScores || {},
    remoteState.syncMeta?.assessScores || {}
  );

  const workflowMap = new Map();
  [...(localState.workflows || []), ...(remoteState.workflows || [])].forEach((workflow) => {
    if (!workflow) return;

    const workflowId = workflow.id || `${workflow.student || 'unknown'}:${workflow.stage || 'stage'}:${normalizeTimestamp(workflow.updatedAt ?? workflow.timestamp, Date.now())}`;
    const nextWorkflow = {
      ...workflow,
      id: workflowId,
      updatedAt: normalizeTimestamp(workflow.updatedAt ?? workflow.timestamp, Date.now())
    };

    const existing = workflowMap.get(workflowId);
    if (!existing || nextWorkflow.updatedAt >= existing.updatedAt) {
      workflowMap.set(workflowId, nextWorkflow);
    }
  });

  const mergedWorkflows = [...workflowMap.values()].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
  const behaviorLogMap = new Map();
  [...(localState.behaviorLogs || []), ...(remoteState.behaviorLogs || [])].forEach((log) => {
    if (!log) return;

    const logId = log.id || `${log.student || 'unknown'}:${log.tag || 'tag'}:${normalizeTimestamp(log.timestamp, Date.now())}`;
    const nextLog = {
      ...log,
      id: logId,
      timestamp: normalizeTimestamp(log.timestamp, Date.now())
    };

    const existing = behaviorLogMap.get(logId);
    if (!existing || nextLog.timestamp >= existing.timestamp) {
      behaviorLogMap.set(logId, nextLog);
    }
  });

  const mergedBehaviorLogs = [...behaviorLogMap.values()].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const careInteractionMap = new Map();
  [...(localState.careInteractions || []), ...(remoteState.careInteractions || [])].forEach((interaction) => {
    if (!interaction) return;

    const interactionId = interaction.id || `${interaction.student || 'unknown'}:${normalizeTimestamp(interaction.timestamp, Date.now())}`;
    const nextInteraction = {
      ...interaction,
      id: interactionId,
      timestamp: normalizeTimestamp(interaction.timestamp, Date.now())
    };

    const existing = careInteractionMap.get(interactionId);
    if (!existing || nextInteraction.timestamp >= existing.timestamp) {
      careInteractionMap.set(interactionId, nextInteraction);
    }
  });

  const mergedCareInteractions = [...careInteractionMap.values()].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const mergedState = {
    ...localState,
    ...remoteState,
    attendanceLog: mergedAttendanceLog,
    attState: mergedAttState,
    assessScores: mergedAssessScores,
    workflows: mergedWorkflows,
    behaviorLogs: mergedBehaviorLogs,
    careInteractions: mergedCareInteractions,
    syncMeta: {
      attState: {},
      attendanceLog: {},
      assessScores: {},
      workflows: {},
      behaviorLogs: {},
      careInteractions: {}
    }
  };

  mergedState.attState = deriveCurrentAttendance(mergedAttendanceLog);
  mergedState.syncMeta = buildSyncMeta(mergedState);
  return mergedState;
};


export const getStore = () => {
  const stored = localStorage.getItem(STORE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return migrateLegacyAttendance({ ...defaultState, ...parsed });
    } catch (e) {
      console.error('Failed to parse store', e);
      return migrateLegacyAttendance({ ...defaultState });
    }
  }
  return migrateLegacyAttendance({ ...defaultState });
};

export const saveStore = (state) => {
  const normalized = migrateLegacyAttendance({ ...defaultState, ...state });
  localStorage.setItem(STORE_KEY, JSON.stringify(normalized));
  if (normalized.teacherId) localStorage.setItem('educare_teacher_id', normalized.teacherId);
  if (normalized.teacherName) localStorage.setItem('educare_teacher_name', normalized.teacherName);
  if (normalized.authToken) localStorage.setItem('educare_auth_token', normalized.authToken);
  if (normalized.pin !== undefined) localStorage.setItem('educare_pin', normalized.pin);
  if (normalized.currentClass !== undefined) localStorage.setItem('educare_current_class', normalized.currentClass);
  if (normalized.classes) localStorage.setItem('educare_classes', JSON.stringify(normalized.classes));
  localStorage.setItem('educare_last_sync_id', String(normalized.lastSyncId ?? 0));
  return normalized;
};

export const getAttendance = () => {
  const state = getStore();
  return state.attState || {};
};

export const getAttendanceWindow = (student, days = 14) => {
  const state = getStore();
  const records = state.attendanceLog?.[student] || {};
  const dayEntries = Object.entries(records).sort((a, b) => a[0].localeCompare(b[0]));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  return dayEntries
    .filter(([dateKey]) => dateKey >= cutoffKey)
    .map(([dateKey, value]) => ({ date: dateKey, status: value }));
};

export const updateAttendance = (student, status) => {
  const state = getStore();
  state.attendanceLog = state.attendanceLog || {};
  state.attendanceLog[student] = state.attendanceLog[student] || {};
  state.attendanceLog[student][getDateKey()] = status;
  state.attState = deriveCurrentAttendance(state.attendanceLog);
  saveStore(state);
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

  const syncState = {
    attState: state.attState,
    attendanceLog: state.attendanceLog,
    assessScores: state.assessScores,
    workflows: state.workflows,
    behaviorLogs: state.behaviorLogs,
    careInteractions: state.careInteractions,
    syncMeta: buildSyncMeta(state)
  };

  return encryptSyncBlob(JSON.stringify(syncState), passphrase, state.teacherId);
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
    const mergedState = mergeSyncState(state, {
      attState: remoteData.attState || {},
      attendanceLog: remoteData.attendanceLog || {},
      assessScores: remoteData.assessScores || {},
      workflows: remoteData.workflows || [],
      behaviorLogs: remoteData.behaviorLogs || [],
      careInteractions: remoteData.careInteractions || [],
      syncMeta: remoteData.syncMeta || buildSyncMeta(remoteData)
    });

    state.attendanceLog = mergedState.attendanceLog;
    state.attState = mergedState.attState;
    state.assessScores = mergedState.assessScores;
    state.workflows = mergedState.workflows;
    state.behaviorLogs = mergedState.behaviorLogs;
    state.careInteractions = mergedState.careInteractions;
    state.syncMeta = mergedState.syncMeta;
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

export const getBehaviorLogs = (student = null) => {
  const logs = getStore().behaviorLogs || [];
  return student ? logs.filter((log) => log.student === student) : logs;
};

export const addBehaviorLog = (student, tag, timestamp = Date.now()) => {
  const state = getStore();
  const safeTag = String(tag || '').trim();
  if (!student || !safeTag) return null;

  const newLog = {
    id: `${student}:${safeTag}:${timestamp}`,
    student,
    tag: safeTag,
    timestamp
  };

  state.behaviorLogs = [...(state.behaviorLogs || [])].filter((log) => {
    return !(log.student === student && log.tag === safeTag && log.timestamp === timestamp);
  });
  state.behaviorLogs.push(newLog);
  saveStore(state);
  return newLog;
};

export const addCareInteraction = (student, actionTaken, outcomeSelected, notes = '', timestamp = Date.now()) => {
  const state = getStore();
  if (!student || !actionTaken || !outcomeSelected) return null;

  const followUpDate = timestamp + (7 * 24 * 60 * 60 * 1000); // 7 days from interaction timestamp

  const newInteraction = {
    id: `${student}:care:${timestamp}`,
    student,
    actionTaken,
    outcomeSelected,
    notes: String(notes || '').trim(),
    timestamp,
    followUpDate
  };

  state.careInteractions = [...(state.careInteractions || [])];
  state.careInteractions.push(newInteraction);
  saveStore(state);
  return newInteraction;
};

export const getCareInteractionsForStudent = (student) => {
  const interactions = getStore().careInteractions || [];
  return interactions
    .filter((interaction) => interaction.student === student)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const getCareInteractionsDue = () => {
  const now = Date.now();
  const interactions = getStore().careInteractions || [];
  return interactions
    .filter((interaction) => interaction.followUpDate && interaction.followUpDate <= now)
    .sort((a, b) => (a.followUpDate || 0) - (b.followUpDate || 0));
};

// Per-device credential used only to authenticate this device to the sync backend.
// It is intentionally unrelated to the teacher's PIN (which derives the local
// encryption key, see crypto.js) and is never included in the sync blob.
const AUTH_PASSWORD_KEY = 'educare_auth_password';

const generateRandomPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const getOrCreateAuthPassword = () => {
  let password = localStorage.getItem(AUTH_PASSWORD_KEY);
  if (!password) {
    password = generateRandomPassword();
    localStorage.setItem(AUTH_PASSWORD_KEY, password);
  }
  return password;
};
