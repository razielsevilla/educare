// src/store.js
import { encryptSyncBlob, decryptSyncBlob, looksLikeEncryptedBlob } from './crypto.js';
import CryptoJS from 'crypto-js';

const STORE_KEY = 'educare_local_state';
const LEGACY_PIN_KEY = 'educare_pin';
const PIN_VERIFIER_KEY = 'educare_pin_verifier';
const PIN_LOCK_KEY = 'educare_pin_lock';
const ENCRYPTED_LOCAL_PREFIX = 'enc:local:v1:';
const PIN_KDF_ITERATIONS = 250000;

let sessionPin = '';

const randomHex = (byteLength = 16) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const timingSafeEquals = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
};

const derivePinDigest = (pin, saltHex, iterations = PIN_KDF_ITERATIONS) => {
  const key = CryptoJS.PBKDF2(pin, CryptoJS.enc.Hex.parse(saltHex), {
    keySize: 256 / 32,
    iterations,
    hasher: CryptoJS.algo.SHA256
  });
  return key.toString(CryptoJS.enc.Hex);
};

const getStoredPinVerifier = () => {
  const raw = localStorage.getItem(PIN_VERIFIER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.salt || !parsed.hash) return null;
    return {
      salt: String(parsed.salt),
      hash: String(parsed.hash),
      iterations: Number(parsed.iterations) || PIN_KDF_ITERATIONS,
      createdAt: Number(parsed.createdAt) || Date.now()
    };
  } catch (_err) {
    return null;
  }
};

const setStoredPinVerifier = (pin) => {
  const salt = randomHex(16);
  const hash = derivePinDigest(pin, salt, PIN_KDF_ITERATIONS);
  localStorage.setItem(PIN_VERIFIER_KEY, JSON.stringify({
    salt,
    hash,
    iterations: PIN_KDF_ITERATIONS,
    createdAt: Date.now()
  }));
};

const getPinLockState = () => {
  const raw = localStorage.getItem(PIN_LOCK_KEY);
  if (!raw) {
    return { failedAttempts: 0, lockedUntil: 0 };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      failedAttempts: Number(parsed.failedAttempts) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0
    };
  } catch (_err) {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
};

const setPinLockState = (nextState) => {
  localStorage.setItem(PIN_LOCK_KEY, JSON.stringify({
    failedAttempts: Number(nextState.failedAttempts) || 0,
    lockedUntil: Number(nextState.lockedUntil) || 0
  }));
};

const resetPinLockState = () => {
  setPinLockState({ failedAttempts: 0, lockedUntil: 0 });
};

const computeLockDelayMs = (failedAttempts) => {
  if (failedAttempts <= 2) return 0;
  if (failedAttempts >= 8) return 5 * 60 * 1000;
  return Math.min(60 * 1000, 1000 * (2 ** (failedAttempts - 3)));
};

const registerFailedPinAttempt = () => {
  const state = getPinLockState();
  const nextAttempts = (state.failedAttempts || 0) + 1;
  const delayMs = computeLockDelayMs(nextAttempts);
  const lockedUntil = delayMs > 0 ? Date.now() + delayMs : 0;
  const next = { failedAttempts: nextAttempts, lockedUntil };
  setPinLockState(next);
  return next;
};

const deriveLocalStorageKey = (pin, saltHex) => {
  return CryptoJS.PBKDF2(pin, CryptoJS.enc.Hex.parse(saltHex), {
    keySize: 256 / 32,
    iterations: PIN_KDF_ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  });
};

const encryptLocalState = (state, pin) => {
  const ivHex = randomHex(16);
  const saltHex = randomHex(16);
  const key = deriveLocalStorageKey(pin, saltHex);
  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(state), key, {
    iv: CryptoJS.enc.Hex.parse(ivHex),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).ciphertext.toString(CryptoJS.enc.Base64);

  const payload = {
    v: 1,
    iv: ivHex,
    salt: saltHex,
    iterations: PIN_KDF_ITERATIONS,
    ct: ciphertext
  };

  return `${ENCRYPTED_LOCAL_PREFIX}${btoa(JSON.stringify(payload))}`;
};

const decryptLocalState = (encrypted, pin) => {
  const encoded = encrypted.replace(ENCRYPTED_LOCAL_PREFIX, '');
  const payload = JSON.parse(atob(encoded));
  const key = deriveLocalStorageKey(pin, payload.salt);
  const decrypted = CryptoJS.AES.decrypt(
    {
      ciphertext: CryptoJS.enc.Base64.parse(payload.ct)
    },
    key,
    {
      iv: CryptoJS.enc.Hex.parse(payload.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );
  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
  if (!plaintext) {
    throw new Error('Unable to decrypt local state with provided PIN');
  }
  return JSON.parse(plaintext);
};

const migrateLegacyPinStorage = () => {
  const legacyPin = localStorage.getItem(LEGACY_PIN_KEY);
  if (!legacyPin) return;

  if (!getStoredPinVerifier()) {
    setStoredPinVerifier(legacyPin);
  }
  localStorage.removeItem(LEGACY_PIN_KEY);
};

migrateLegacyPinStorage();

// Builds a local calendar-date key (YYYY-MM-DD). Deliberately avoids
// Date#toISOString(), which converts to UTC — in any timezone ahead of UTC (e.g. the
// Philippines, this app's target market, at UTC+8) that silently shifts local midnight
// back onto the previous day's date string.
const getDateKey = (date = new Date()) => {
  const normalized = new Date(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  pin: '',
  classes: JSON.parse(localStorage.getItem('educare_classes') || '[]'),
  currentClass: localStorage.getItem('educare_current_class') || '',
  lastSyncId: parseInt(localStorage.getItem('educare_last_sync_id') || '0', 10),
  students: [],
  attendanceLog: {},
  attState: {},
  assessments: [],
  submissions: {},

  workflows: [],
  behaviorLogs: [],
  careInteractions: [],
  syncMeta: {
    attState: {},

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

  const studentKey = (student) => `${student?.name || ''}::${student?.class || ''}`;
  const studentMap = new Map();
  [...(localState.students || []), ...(remoteState.students || [])].forEach((student) => {
    if (!student) return;
    const normalized = typeof student === 'object' ? student : { name: student, class: '' };
    studentMap.set(studentKey(normalized), normalized);
  });
  const mergedStudents = [...studentMap.values()];

  const mergedState = {
    ...localState,
    ...remoteState,
    students: mergedStudents,
    attendanceLog: mergedAttendanceLog,
    attState: mergedAttState,

    workflows: mergedWorkflows,
    behaviorLogs: mergedBehaviorLogs,
    careInteractions: mergedCareInteractions,
    syncMeta: {
      attState: {},
      attendanceLog: {},

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
      if (stored.startsWith(ENCRYPTED_LOCAL_PREFIX)) {
        if (!sessionPin) {
          return migrateLegacyAttendance({ ...defaultState, pin: '' });
        }

        const parsedEncrypted = decryptLocalState(stored, sessionPin);
        return migrateLegacyAttendance({ ...defaultState, ...parsedEncrypted, pin: sessionPin });
      }

      const parsed = JSON.parse(stored);
      return migrateLegacyAttendance({ ...defaultState, ...parsed, pin: sessionPin });
    } catch (e) {
      console.error('Failed to parse store', e);
      return migrateLegacyAttendance({ ...defaultState, pin: sessionPin });
    }
  }
  return migrateLegacyAttendance({ ...defaultState, pin: sessionPin });
};

export const saveStore = (state) => {
  const normalized = migrateLegacyAttendance({ ...defaultState, ...state });
  const safeState = { ...normalized, pin: '' };

  if (sessionPin && hasSecurityPinConfigured()) {
    localStorage.setItem(STORE_KEY, encryptLocalState(safeState, sessionPin));
  } else if (!hasSecurityPinConfigured()) {
    localStorage.setItem(STORE_KEY, JSON.stringify(safeState));
  }
  // else: a PIN is configured but this session hasn't unlocked it yet (sessionPin is
  // empty). getStore() can't have decrypted the real state in that case, so `state`
  // here is just the empty default shape — writing it would clobber the encrypted
  // blob with plaintext nothing. Leave STORE_KEY untouched; only the auxiliary
  // plaintext keys below (teacherId/authToken/etc.) are safe to persist while locked.

  if (normalized.teacherId) localStorage.setItem('educare_teacher_id', normalized.teacherId);
  if (normalized.teacherName) localStorage.setItem('educare_teacher_name', normalized.teacherName);
  if (normalized.authToken) localStorage.setItem('educare_auth_token', normalized.authToken);
  if (normalized.currentClass !== undefined) localStorage.setItem('educare_current_class', normalized.currentClass);
  if (normalized.classes) localStorage.setItem('educare_classes', JSON.stringify(normalized.classes));
  localStorage.setItem('educare_last_sync_id', String(normalized.lastSyncId ?? 0));
  return { ...normalized, pin: sessionPin };
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
  // days=14 means the 14 calendar days ending today (today, today-1, ..., today-13),
  // so the cutoff is today minus (days - 1), not today minus days.
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffKey = getDateKey(cutoff);

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
    state.attendanceLog = state.attendanceLog || {};
    state.attendanceLog[name] = { ...(state.attendanceLog[name] || {}), [getDateKey()]: 'P' }; // Default attendance
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



// Returns the encrypted blob for syncing.
export const getSyncBlob = async () => {
  const state = getStore();
  const passphrase = sessionPin || '';
  if (!state.teacherId) {
    throw new Error('teacherId is required before syncing encrypted state');
  }
  if (!passphrase) {
    throw new Error('PIN/passphrase is required to derive the sync encryption key');
  }

  const syncState = {
    students: state.students,
    attState: state.attState,
    attendanceLog: state.attendanceLog,

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

    const passphrase = sessionPin || '';
    if (!passphrase) {
      throw new Error('PIN/passphrase is required to decrypt the sync payload');
    }

    const decrypted = await decryptSyncBlob(blobStr, passphrase, state.teacherId);
    const remoteData = JSON.parse(decrypted);
    const mergedState = mergeSyncState(state, {
      students: remoteData.students || [],
      attState: remoteData.attState || {},
      attendanceLog: remoteData.attendanceLog || {},

      workflows: remoteData.workflows || [],
      behaviorLogs: remoteData.behaviorLogs || [],
      careInteractions: remoteData.careInteractions || [],
      syncMeta: remoteData.syncMeta || buildSyncMeta(remoteData)
    });

    state.students = mergedState.students;
    state.attendanceLog = mergedState.attendanceLog;
    state.attState = mergedState.attState;

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

export const hasSecurityPinConfigured = () => Boolean(getStoredPinVerifier());

export const getPinLockStatus = () => {
  const state = getPinLockState();
  const now = Date.now();
  const isLocked = state.lockedUntil > now;
  return {
    failedAttempts: state.failedAttempts,
    isLocked,
    lockedUntil: isLocked ? state.lockedUntil : 0,
    remainingMs: isLocked ? Math.max(0, state.lockedUntil - now) : 0
  };
};

export const setSessionPin = (pin) => {
  sessionPin = String(pin || '');
};

export const clearSessionPin = () => {
  sessionPin = '';
};

export const hasSessionPin = () => Boolean(sessionPin);

export const setupSecurityPin = (pin) => {
  const normalized = String(pin || '').trim();
  if (!/^\d{4}$/.test(normalized)) {
    throw new Error('PIN must be exactly 4 digits');
  }

  setStoredPinVerifier(normalized);
  setSessionPin(normalized);
  resetPinLockState();
  localStorage.removeItem(LEGACY_PIN_KEY);
  return true;
};

export const verifySecurityPin = (pin) => {
  const normalized = String(pin || '').trim();
  if (!/^\d{4}$/.test(normalized)) {
    return { ok: false, reason: 'format' };
  }

  const lockStatus = getPinLockStatus();
  if (lockStatus.isLocked) {
    return {
      ok: false,
      reason: 'locked',
      lockedUntil: lockStatus.lockedUntil,
      remainingMs: lockStatus.remainingMs
    };
  }

  const verifier = getStoredPinVerifier();
  if (!verifier) {
    return { ok: false, reason: 'not-configured' };
  }

  const computedHash = derivePinDigest(normalized, verifier.salt, verifier.iterations);
  if (!timingSafeEquals(computedHash, verifier.hash)) {
    const failed = registerFailedPinAttempt();
    const now = Date.now();
    return {
      ok: false,
      reason: failed.lockedUntil > now ? 'locked' : 'invalid',
      failedAttempts: failed.failedAttempts,
      lockedUntil: failed.lockedUntil,
      remainingMs: failed.lockedUntil > now ? failed.lockedUntil - now : 0
    };
  }

  setSessionPin(normalized);
  resetPinLockState();
  return { ok: true };
};

// A forgotten PIN has no recovery path: the local state blob (and any blob already
// pushed to sync) is encrypted with a key derived from that PIN, so there is no way
// to recover the underlying data without it. This wipes the now-unrecoverable
// encrypted blob and the PIN itself so the teacher can set up a new PIN and start a
// fresh local roster, rather than being silently locked out forever. The caller is
// responsible for getting explicit confirmation first — this is a destructive,
// unrecoverable action.
export const resetForgottenPin = () => {
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem(PIN_VERIFIER_KEY);
  localStorage.removeItem(PIN_LOCK_KEY);
  clearSessionPin();
};
